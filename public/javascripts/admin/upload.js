document.observe("dom:loaded", function() { 
  new Ajax_upload('#upload', {
    action: '/admin/assets',
    name: 'asset[asset]',  
    onComplete: function(file, response){
      // alert(response)
      $('assets_index').replace(response);
      new Effect.Highlight('assets_index');
    }
  });     
});