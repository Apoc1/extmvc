Ext.ns('Ext.ux.MVC.Model.Adapter');

(function() {
  var A = Ext.ux.MVC.Model.Adapter;
  
  A.REST = {
    initialize: function(model) {
      console.log('initialising REST adapter');
      
      A.Abstract.initialize(model);
    },
    
    classMethods: {
      /**
       * Generic find method, accepts many forms:
       * find(10, opts)      // equivalent to findById(10, opts)
       * find('all', opts)   // equivalent to findAll(opts)
       * find('first', opts) // equivalent to findById(1, opts)
       */
      find: function(what, options) {
        var id;
        if (id = parseInt(what, 10)) {
          return this.findById(id, options);
        };
        
        switch(what) {
          case 'first': return this.findById(1, options);
          default     : return this.findAll(options);
        }
      },
      
      /**
       * Shortcut for findByField('id', 1, {})
       */
      findById: function(id, options) {
        // return this.findByField('id', id, options);
        var options = options || {};
        Ext.applyIf(options, {
          url: this.singleDataUrl(id)
        });
        
        return this.performFindRequest(options);
      },
          
      /**
       * Performs a custom find on a given field and value pair.  e.g.:
       * User.findByField('email', 'adama@bsg.net') creates the following request:
       * GET /users?email=adama@bsg.net
       * And creates an array of User objects based on the server's response
       * @param {String} fieldName The name of the field to search on
       * @param {String/Number} matcher The field value to search for
       * @param {Object} options An object which should contain at least a success function, which will
       * be passed an array of instantiated model objects
       */
      findByField: function(fieldName, matcher, options) {
        var fieldName = fieldName || 'id';
        var options   = options || {};
        
        options.conditions = options.conditions || [];
        options.conditions.push({key: fieldName, value: matcher, comparator: '='});
                
        return this.performFindRequest(options);
      },
      
      findAll: function(options) {
        var options = options || {};
        
        return new Ext.data.Store(
          Ext.applyIf(options, {
            autoLoad:   true,
            remoteSort: true,
            method:     'get',
            url:        this.collectionDataUrl(),
            reader:     this.getReader()
          })
        );
      },
      
      /**
       * Private, internal methods below here.  Not expected to be useful by anything else but
       * are left public for now just in case
       */
       
      /**
       * Underlying function which handles all find requests.  Private
       */
      performFindRequest: function(options) {
        var options = options || {};
        Ext.applyIf(options, {
          scope:   this,
          url:     this.collectionDataUrl(),
          method:  'get',
          success: Ext.emptyFn,
          failure: Ext.emptyFn
        });
        
        //local references to reader and constructor so they can be used within callbacks
        var reader      = this.getReader();
        var constructor = this;
        
        //keep a handle on user-defined callbacks
        var successFn = options.success;
        
        options.success = function(response, opts) {
          var m = reader.read(response);
          if (m && m.records[0]) {
            //FIXME: this is not great... we're instantiating two objects here, and both
            //basically do the same job.  Would be better to instantiate the model object
            //directly rather than as the result of the getReader().read method
            var obj = new constructor(m.records[0].data);
            obj.newRecord = false;
            
            successFn.call(options.scope, obj);
          } else {
            failureFn.call(options.scope, response);
          };
        };
        
        /**
         * Build params variable from condition options.  Params should always be a string here
         * as we're dealing in GET requests only for a find
         */
        var params = options.params || '';
        if (options.conditions && options.conditions[0]) {
          for (var i=0; i < options.conditions.length; i++) {
            params += String.format("{0}{1}{2}", cond['key'], (cond['comparator'] || '='), cond['value']);
          };
          
          delete options.conditions;
        };
        options.params = params;
        
        return Ext.Ajax.request(options);
      },
      
      /**
       * Extension appended to the end of all generated urls (e.g. '.js').  Defaults to blank
       */
      urlExtension: '',
      
      /**
       * Default url namespace prepended to all generated urls (e.g. '/admin').  Defaults to blank
       */
      urlNamespace: '',
      
      /**
       * URL to retrieve a JSON representation of this model from
       */
      singleDataUrl : function(id) {
        return this.namespacedUrl(String.format("{0}/{1}", this.urlName, id));
      },
  
      /**
       * URL to retrieve a JSON representation of the collection of this model from
       * This would typically return the first page of results (see {@link #collectionStore})
       */
      collectionDataUrl : function() {
        return this.namespacedUrl(this.urlName);
      },
  
      /**
       * URL to retrieve a tree representation of this model from (in JSON format)
       * This is used when populating most of the trees in Ext.ux.MVC, though
       * only applies to models which can be representated as trees
       */
      treeUrl: function() {
        return this.namespacedUrl(String.format("{0}/tree", this.urlName));
      },
  
      /**
       * URL to post details of a drag/drop reorder operation to.  When reordering a tree
       * for a given model, this url is called immediately after the drag event with the
       * new configuration
       * TODO: Provide more info/an example here
       */
      treeReorderUrl: function() {
        return this.namespacedUrl(String.format("{0}/reorder/{1}", this.urlName, this.data.id));
      },
  
      /**
       * Provides a namespaced url for a generic url segment.  Wraps the segment in this.urlNamespace and this.urlExtension
       * @param {String} url The url to wrap
       * @returns {String} The namespaced URL
       */
      namespacedUrl: function(url) {
        return(String.format("{0}/{1}{2}", this.urlNamespace, url, this.urlExtension));
      } 
    },
    
    instanceMethods: {
      save: function(options) {
        var options = options || {};
        
        if (options.performValidations === true) {
          //TODO: tie in validations here
        };
        
        //set a _method param to fake a PUT request (used by Rails)
        var params = options.params || Ext.ux.MVC.Model.namespaceFields(this.data, this.modelName);
        if (!this.newRecord) { params["_method"] = 'put'; }
        delete options.params;
        
        //keep a reference to this record for use in the success interceptor below
        var record = this;
        
        Ext.Ajax.request(
          Ext.applyIf(options, {
            url:    this.url(),
            method: 'post',
            params:  params,
            
            //intercept the callback to mark the record as not new
            success: (options.success || Ext.emptyFn).createInterceptor(function() {
              record.newRecord = false;
            })
          })
        );
      },
      
      reload: function() {
        console.log('reloading');
      },
      
      destroy: function(options) {
        console.log('destroying');
        
        Ext.Ajax.request(
          Ext.applyIf(options, {
            url:    this.url(),
            method: 'post',
            params: "_method=delete"
          })
        );
      }
    }
  };
})();

Ext.ux.MVC.Model.AdapterManager.register('REST', Ext.ux.MVC.Model.Adapter.REST);