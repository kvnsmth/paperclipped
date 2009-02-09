document.observe("dom:loaded", function() { 
  new Ajax_upload('#upload', {
    action: '/admin/assets',
    name: 'asset[asset]',  
    onComplete: function(file, response){
      // alert(response)
      $('assets_table').replace(response);
    }
  });     
});