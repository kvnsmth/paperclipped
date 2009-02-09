/**
 * Ajax upload plugin for Prototype
 * Project page - http://valums.com/ajax-upload/
 * Copyright (c) 2008 Andris Valums, http://valums.com
 * Licensed under the MIT license (http://valums.com/mit-license/)
 * Version 1.0 (24.01.2009)
 *
 * Port to prototype was made with the help of Yury Velikanau, Ribose Inc.
 */
(function(){
	// we need Prototype to run
	if ( ! Prototype) return;
		
	/**
	 * Function generates unique id
	 */		
	var get_uid = function(){
		var uid = 0;
		return function(){
			return uid++;
		}
	}();

	window.Ajax_upload = Class.create({
		/**
		 * button - element
		 * option - hash of options :
		 *   action - URL which iframe will use to post data
		 *   name - file input name
		 *   data - extra data hash to post within the file
		 *   onSubmit - callback to fire on file submit
		 *   onComplete - callback to fire when iframe has finished loading
		 */		
		initialize: function(button, options) {
			// get element by id	
			if (typeof button == "string") {
				button = $$(button);

				if (button.length != 1){
					//You should pass only 1 element to ajax upload ot once
					return;
				}
				
				button = button[0];
								
			}
			this.button = button;
					
			this.wrapper = null;
			this.form = null;
			this.input = null;
			this.iframe = null;		
	
			this.disabled = false;
			this.submitting = false;
					
			this.settings = $H({
				// Location of the server-side upload script
				action: 'upload.php',			
				// File upload name
				name: 'userfile',
				// Additional data to send
				data: {},
				// Callback to fire when user selects file
				// You can return false to cancel upload
				onSubmit: function(file, extension) {},
				// Fired when file upload is completed
				onComplete: function(file, response) {}
			})
			// Merge the users options with our defaults
			.update(options);
			
			this.create_wrapper();
			this.create_input();
			
			//if (jQuery.browser.msie){
				//fixes bug, which occur when you use div with transparent background as upload button
				//this.make_parent_opaque();
			//}
			
			this.create_iframe();		
		},
		set_data : function(data){
			// I had 1 report, that set_data function don't work
			this.settings.set('data', data);
		},
		disable : function(){
			this.disabled = true;
			if ( ! this.submitting){
				this.input.writeAttribute('disabled', true);
				this.button.removeClassName('hover');	
			}			
		},
		enable : function(){
			this.disabled = false;
			this.input.writeAttribute('disabled', false);						
		},
		/**
		 * Creates wrapper for button and invisible file input
		 */
		create_wrapper : function(){
			// Shorten names			
			var button = this.button, wrapper;
			
			wrapper = this.wrapper = new Element('div');
			button.insert({ after: wrapper });
			wrapper.insert(button);
			//new Insertion.After(button, wrapper);		

			// wait a bit because of FF bug
			// it can't properly calculate the outerHeight
			setTimeout(function(){
				var dimensions = button.getDimensions();
				wrapper.setStyle({
					position: 'relative'
					,display: 'block'
					,overflow: 'hidden'
					
					// we need dimensions because of ie bug that allows to move 
					// input outside even if overflow set to hidden
					,height: dimensions.height
					,width: dimensions.width
				});						
			}, 1);
			
			var self = this;
			wrapper.observe('mousemove', function(e) {
				// Move the input with the mouse, so the user can't misclick it
				if (!self.input) {
					return;
				}
									
				self.input.setStyle({
					top: e.pageY - wrapper.cumulativeOffset().top - 5 + 'px'
					,left: e.pageX - wrapper.cumulativeOffset().left - 170 + 'px'
				});
			});

	
		},
		/**
		 * Creates invisible file input above the button 
		 */
		create_input : function(){
			var self = this;
			
			this.input = new Element('input', { type: 'file', name: this.settings.get('name') });
			this.input.setStyle({
		    	position: 'absolute'
		    	,margin: 0
		    	,padding: 0
		    	,width: '220px'
		    	,height: '10px'
		    	,opacity: 0
				,cursor: 'pointer'
		    });

			this.wrapper.insert(this.input);	
			this.input.observe('change', function(){
				if (self.input.value == ''){
					// there is no file
					return;
				}
				
				// we need to lock "disable" method
				self.submitting = true;
				
				// Submit form when value is changed
				self.submit();				
				
				if (self.disabled){
					self.disable();					
				}
							
				// unlock "disable" method
				self.submitting = false;
				
				// clear input to allow user to select same file
				// Thanks to boston for fix
				self.input.value = '';				
			});
			
			// Emulate button hover effect
			this.input.observe('mouseover', function(){
				self.button.addClassName('hover');				
			});
			this.input.observe('mouseout', function(){
				self.button.removeClassName('hover');				
			});						

			if (this.disabled){
				this.input.writeAttribute('disabled', 'disabled');
			}

		},
		/**
		 * Creates iframe with unique name
		 */
		create_iframe : function(){
			// unique name
			// We cannot use getTime, because it sometimes return
			// same value in safari :(
			var id = 'valumsl8mh6sdc_' + get_uid();
		    
			// create iframe, so we dont need to refresh page
			this.iframe = new Element('iframe', { id: id, name: id });
		    this.iframe.setStyle({ display: 'none' });
		    $(document.body).insert(this.iframe);											
		},
		/**
		 * Upload file without refreshing the page
		 */
		submit : function(){			
			var self = this, settings = this.settings;			
			
			// get filename from input
			var file = this.file_from_path(this.input.value);			

			// execute user event
			if (settings.get('onSubmit').call(this, file, this.get_ext(file)) === false){
				// Do not continue if user function returns false						
				return;
			}			

			this.create_form();
			this.form.insert(this.input);		
			this.form.submit();			
			
			this.input.remove(); this.input = null;
			this.form.remove();	this.form = null;

			this.submitting = false;
			
			// create new input
			this.create_input();	
	
			var iframe = this.iframe;
			iframe.observe('load', function() {
				if (!iframe || iframe.src == "about:blank"){
					return;
				}

				var doc = iframe.contentDocument ? iframe.contentDocument : frames[iframe.id].document;
				var response = doc.body.innerHTML;

				settings.get('onComplete').call(self, file, response);				
				// Workaround for FF2 bug, which causes cursor to be in busy state after post.
				setTimeout(function(){
					// Workaround for ie6 bug, which causes progress bar to be in busy state after post.
					// Thanks to Lei for the fix
					iframe.src = "about:blank";

					iframe.remove(); iframe = null;
				}, 1);				
			});
			
			// Create new iframe, so we can have multiple uploads at once
			this.create_iframe();		
		},		
		/**
		 * Creates form, that will be submitted to iframe
		 */
		create_form : function(){
			//random string to prevent collision
			var form_id = 'valumsl86jtegr' + get_uid();
			// method, enctype must be specified here
			// because changing this attr on the fly is not allowed in IE 6/7
			// this string must be written to DOM at once
			
			var form_html = '<form id="' + form_id + '" method="post" enctype="multipart/form-data"></form>';
			$(document.body).insert(form_html);
			
			this.form = $(form_id);				
		    this.form.writeAttribute({
				action: this.settings.get('action'),
				target: this.iframe.name
		    });
			
			// Create hidden input element for each data key.
	    	for (var i in this.settings.get('data')) {
				this.form.insert(
					new Element('input', { type: 'hidden', name: i, value: this.settings.get('data')[i] })
				);
	    	}
		},		
		file_from_path : function(file){
			return file.replace(/.*(\/|\\)/, "");			
		},
		get_ext : function(file){
			return (/[.]/.exec(file)) ? /[^.]+$/.exec(file.toLowerCase()) : '';
		},
		make_parent_opaque : function(){
			//TODO
			return;
			// ie transparent background bug
			this.button.add(this.button.parents()).each(function(){				
				var color = $(this).css('backgroundColor');
				var image = $(this).css('backgroundImage');
	
				if ( color != 'transparent' ||  image != 'none'){
					$(this).css('opacity', 1);
					return false;
				}
			});			
		}
	});	
})();