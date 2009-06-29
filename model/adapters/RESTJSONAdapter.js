/**
 * @class ExtMVC.Model.plugin.adapter.RESTJSONAdapter
 * @extends ExtMVC.Model.plugin.adapter.RESTAdapter
 * An adapter which hooks into a RESTful server side API that expects JSON for its data storage
 */
ExtMVC.Model.plugin.adapter.RESTJSONAdapter = Ext.extend(ExtMVC.Model.plugin.adapter.RESTAdapter, {

  /**
   * Performs the actual save request.  Uses POST for new records, PUT when updating existing ones
   * puts the data into jsonData for the request
   */
  doSave: function(instance, options) {
    if (typeof instance == 'undefined') throw new Error('No instance provided to REST Adapter save');
    
    Ext.applyIf(options || {}, {
      jsonData: instance.data,
      headers:  {
        "Content-Type": "application/json"
      }
    });
    
    ExtMVC.Model.plugin.adapter.RESTJSONAdapter.superclass.doSave.apply(this, arguments);
  },
  
  /**
   * Decodes response text received from the server as the result of requesting data for a single record.
   * By default this expects the data to be in the form {"model_name": {"key": "value", "key2", "value 2"}}
   * and would return an object like {"key": "value", "key2", "value 2"}
   * @param {String} responseText The raw response text
   * @param {Function} constructor The constructor used to construct model instances.  Useful for access to the prototype
   * @return {Object} Decoded data suitable for use in a model constructor
   */
  decodeSingleLoadResponse: function(responseText, constructor) {
    var tname = ExtMVC.Inflector.singularize(constructor.prototype.tableName);
    return Ext.decode(responseText)[tname];
  },
  
  /**
   * Returns configuration data to be used by the DataProxy when loading records. Override to provide your own config
   * @param {String} url The url the proxy should use. This is typically calculated elsewhere
   * @return {Object} Configuration for the proxy
   */
  buildProxyConfig: function(url) {
    var defaults = ExtMVC.Model.plugin.adapter.RESTJSONAdapter.superclass.buildProxyConfig.apply(this, arguments);
    
    return Ext.apply(defaults, {
      headers: {
        "Content-Type": "application/json"
      }      
    });
  }
});
