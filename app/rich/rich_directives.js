/* ==================================================================
	AngularJS Datatype Editor - Rich Text
	A directive to edit a large text blob in place.
	
	http://www.tinymce.com/wiki.php/api4:index

	Usage:
	<div ade-rich ade-class="input-large" ade-id="1234" ade-max="2000" ade-cut="25" ng-model="data"></div>

	Config:

	ade-id:
		If this id is set, it will be used in messages broadcast to the app on state changes.
	ade-class:
		A custom class to give to the input
	ade-readonly:
		If you don't want the stars to be editable	
	ade-max:
		The optional maximum length to enforce
	ade-cut:
		The number of characters to show as a preview before cutting off and showing
		the rest after a click or hover.  Set to -1 to show all characters and disable hover preview
	ade-save-cancel:
		If you want save/cancel buttons

	Messages:
		name: ADE-start
		data: id from config

		name: ADE-finish
		data: {id from config, old value, new value, exit value}

------------------------------------------------------------------*/

angular.module('ADE').directive('adeRich', ['ADE', '$compile', '$sanitize', function(ADE, $compile, $sanitize) {
	return {
		require: '?ngModel', //optional dependency for ngModel
		restrict: 'A', //Attribute declaration eg: <div ade-rich=""></div>

		scope: {
			adeId: "@",
			adeReadonly: "@",
			adeSaveCancel: "@",
			adeMax: "@",
			ngModel: "="
		},

		//The link step (after compile)
		link: function(scope, element, attrs) {
			// each tinyMCE editor get its own id
			// this is not needed but makes it clearer that were dealing with separate editors
			var id = Math.floor(Math.random() * 100000);
			var editing = false;
			var exit = 0; //0=click, 1=tab, -1= shift tab, 2=return, -2=shift return, 3=esc. controls if you exited the field so you can focus the next field if appropriate
			var timeout = null; //the delay when mousing out of the ppopup
			var readonly = false;
			var maxLength = null; //the maxLength is enforced on edit, not from external changes
			var origMaxLength = null;
			var stopObserving = null;
			var adeId = scope.adeId;
			var supportsTouch = ('ontouchend' in window);
			var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
			var windowW = $(window).width();
			var saveCancel = true;

			if(scope.adeMax!==undefined) origMaxLength = maxLength = parseInt(scope.adeMax);
			if(scope.adeReadonly!==undefined && scope.adeReadonly=="1") readonly = true;
			if(scope.adeSaveCancel!==undefined && scope.adeSaveCancel=="0") saveCancel = false;

			//Whenever the model changes we need to regenerate the HTML for displaying it
			var makeHTML = function() {
				var value = scope.ngModel;
				
				if (value!==undefined) {
					if (angular.isArray(value)) value = value[0];

					if(value==null || value==undefined) value = "";
					if (!value.split) value = value.toString(); //convert to string if not string (to prevent split==undefined)
				} else {
					value="";
				}

				element.html(value);

				//set the max length higher or it would be truncated right away on editing
				if(maxLength && element.text().length>maxLength) maxLength = element.text().length;
			};

			//called once the edit is done, so we can save the new data	and remove edit mode
			var saveEdit = function(exited) {
				// console.log("save",adeId);
				var oldValue = scope.ngModel;
				exit = exited;
						
				var currentLength = $("#tinyText"+id).text().length;

				// don't save value on esc (revert)
				// and if the current length is greater than max length
				if ((exited != 3) && (!maxLength || (currentLength <= maxLength))) {
					if(element!==undefined && element[0]!==undefined) { //if we can't find the editor, dont overwrite the old text with nothing. Just cancel
						//auto-convert urls
						

						// Convert relative urls to absolute urls
						// http://aknosis.com/2011/07/17/using-jquery-to-rewrite-relative-urls-to-absolute-urls-revisited/
						$('#tinyText'+id).find('a').not('[href^="http"],[href^="https"],[href^="mailto:"],[href^="#"]').each(function() {
							var href = this.getAttribute('href');
							var hrefType = href.indexOf('@') !== -1 ? 'mailto:' : 'http://';
							this.setAttribute('href', hrefType + href);
						});
						
						var value = $("#tinyText"+id)[0].innerHTML;
						
						//readjust maxLength if it was artifically extended
						var text = $("#tinyText"+id).text();
						if (maxLength > origMaxLength && maxLength>text.length) {
							maxLength = text.length;
						}

						// check if contents are empty
						if (value === '<p><br data-mce-bogus="1"></p>' || value === '<p></p>' || value === '<p><br></p>') {
							value = '';
						}

						value = $.trim(value);
						scope.ngModel = value;
					} else {
						//editor wasn't found for some reason. Can we recover, or do we need to?
					}
				}

				editing = false;
				hideDiv();

				ADE.done(adeId, oldValue, scope.ngModel, exit);

				if (exit == 1) {
					element.data('dontclick', true); //tells the focus handler not to click
					element.focus();
					//TODO: would prefer to advance the focus to the next logical element on the page
				} else if (exit == -1) {
					element.data('dontclick', true); //tells the focus handler not to click
					element.focus();
					//TODO: would prefer to advance the focus to the previous logical element on the page
				}

				// we're done, no need to listen to events
				destroy();
			};

			//shows a popup with the full text in read mode
			var viewRichText = function() {
				ADE.hidePopup(); //hide any ADE popups already presented

				var modelValue = scope.ngModel ? scope.ngModel : "";
				var editor = '<div id="ade-rich' + id + '" class="ade-rich"><div id="tinyText' + id + '" class="ade-content">' + modelValue + '</div></div>';
				$compile(editor)(scope).insertAfter(element);
				place();
				window.setTimeout(place,300);

				window.setTimeout(function() {
					$('#tinyText'+id).addClass("ade-hover");						
				});

				$('#tinyText'+id).on('mouseleave.ADE', mouseout);
				$('#tinyText'+id).on('click.ADE', mouseclick);
				$('#tinyText'+id).on('mouseenter.ADE', function() {
					window.clearTimeout(timeout);
				});

				// $(document).on('touchend.ADE', function(e) {
				// 	var outerClick = element.has(e.target).length === 0;
				// 	if(outerClick) mouseout();
				// });
			};

			//place the popup in the proper place on the screen by flipping it if necessary
			var place = function() {
				ADE.place('#ade-rich'+id,element,-20,-5);

				//https://remysharp.com/2012/05/24/issues-with-position-fixed-scrolling-on-ios

				//position the editable content
				if($('#tinyText'+id).length) {
					var top = element[0].offsetTop;
					var left = element[0].offsetLeft;
					var height = element.height();
					var width = element.width();
					
					$('#tinyText'+id).css('top',top+"px").css('left',left+"px").css('width',width+"px").css('height',height+"px");
				}

				//If the toolbar exists, we need to place it at the proper place
				if($('.ade-toolbar').length) {
					var top = element[0].offsetTop;
					var left = element[0].offsetLeft;
					var height = $('.ade-toolbar').height();
					if(height==0) height=30; //take a guess
					var pos = top-height; //toolbar is fixed, so we need to place it right above the text area
					var width = $("#tinyText"+id).width()+6;

					$('.ade-toolbar').css('top',pos+"px").css('left',left+"px");
					$('.ade-toolbar').css('width',width+'px');
				}
			};

			// detect clicks outside tinymce while editing
			var outerBlur = function(e) {
				var outerClick = $('#ade-rich'+id).has(e.target).length === 0;

				// check if modal for link is shown
				var modalShown = $('.mce-floatpanel').css('display') === 'block';
				
				if (!modalShown && outerClick) {
					// some elements are outside popup but belong to mce
					// these elements start with the text 'mce_' or have a parent/grandparent that starts with the text 'mce_'
					// the latter include texcolor color pickup background element, link ok and cancel buttons
					var parent = e.target;
					var startsMce = false;
					while (parent) {
						if (parent.id.search('mce') === 0) {
							startsMce = true;
							break;
						}
						parent = parent.parentElement;
					}

					// blur and save changes
					if (!startsMce) {
						saveEdit(0);
					}
				}
			};

			// handle special keyboard events
			var handleKeyEvents = function(e) {
				// Enforce maximum length, if defined

				// http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
				// Esc - 27; Tab - 9; Backspace - 8 ; Delete - 46; Arrow keys = 37-40
				var specialCodes = [27, 9, 8, 46, 37, 38, 39, 40];

				// Do not enforce on special codes
				if (maxLength && specialCodes.indexOf(e.keyCode) == -1) {
					var editorValue = $('#tinyText'+id)[0].innerHTML;
					var length = $('#tinyText'+id).text().length;

					// Don't allow more characters
					if (length >= maxLength) {
						e.stopPropagation();
						e.preventDefault();
					}
				}

				// Listen for esc and tab events
				switch(e.keyCode) {
					case 27: // esc
						scope.$apply(function() {
							saveEdit(3); // don't save results
						});
						e.preventDefault();
						$(document).off('click.ADE');
						break;
					case 9: // tab
						var exit = e.shiftKey ? -1 : 1;
						scope.$apply(function() {
							saveEdit(exit); // blur and save
						});
						e.preventDefault();
						$(document).off('click.ADE');
						break;
					default:
						break;
				}
			};

			//enters edit mode for the text
			var editRichText = function() {
				
				window.clearTimeout(timeout);
				destroy();

				var touchClass="";
				if(iOS) touchClass = " ade-hasTouch"; //because touch devices (iOS) put copy/paste controls that would cover the rich text toolbar

				var toolbar = '<div id="tinyToolbar' + id + '" class="ade-toolbar mce-panel"></div>';
				
				$compile(toolbar)(scope).insertAfter($('#tinyText'+id));
				place();
//				setTimeout(place); //needs to be in a timeout for the popup's height to be calculated correctly

				var toolbarOptions = "saveButton cancelButton | styleselect | forecolor backcolor | bullist numlist | outdent indent | link";
				if(!saveCancel) toolbarOptions = "styleselect | forecolor backcolor | bullist numlist | outdent indent | link";

				// Initialize tinymce
				// Full example:
				// http://www.tinymce.com/tryit/full.php
				tinymce.init({
					selector: "#tinyText"+id,
					theme: "modern",
					menubar: false,
					statusbar: true,
					plugins: ["textcolor", "link", 'fullscreen'],
					toolbar: toolbarOptions,
					baseURL: "",
					inline:true,
					resize: "both",
					fixed_toolbar_container: "#tinyToolbar"+id,
					style_formats: [
						 {title: "Headers", items: [
							  {title: "Header 1", format: "h1"},
							  {title: "Header 2", format: "h2"},
							  {title: "Header 3", format: "h3"},
							  {title: "Header 4", format: "h4"},
							  {title: "Header 5", format: "h5"},
							  {title: "Header 6", format: "h6"}
						 ]},
						 {title: "Sizes", items: [
							  {title: "Small", inline: 'span', styles: {fontSize: '0.8em'}},
							  {title: "Normal", inline: 'span', styles: {fontSize: '1em'}},
							  {title: "Large", inline: 'span', styles: {fontSize: '1.3em'}},
							  {title: "Huge", inline: 'span', styles: {fontSize: '1.7em'}}
						 ]},
						 {title: "Styles", items: [
							  {title: "Bold", icon: "bold", format: "bold"},
							  {title: "Italic", icon: "italic", format: "italic"},
							  {title: "Underline", icon: "underline", format: "underline"},
							  {title: "Strikethrough", icon: "strikethrough", format: "strikethrough"},
							  {title: "Superscript", icon: "superscript", format: "superscript"},
							  {title: "Subscript", icon: "subscript", format: "subscript"},
							  {title: "Code", icon: "code", format: "code"}
						 ]},
						 {title: "Alignment", items: [
							  {title: "Left", icon: "alignleft", format: "alignleft"},
							  {title: "Center", icon: "aligncenter", format: "aligncenter"},
							  {title: "Right", icon: "alignright", format: "alignright"},
							  {title: "Justify", icon: "alignjustify", format: "alignjustify"},
							  {title: "Blockquote", icon: "blockquote",format: "blockquote"},
						 ]}
					],

					setup: function(ed) {
						ed.on('init', function(args) {
														
							//focus the text area. In a timer to allow tinymce to initialize.
							tinymce.execCommand('mceFocus',false,"tinyText"+id);
						});
						ed.on('keydown', handleKeyEvents);
						ed.addButton('saveButton', {
							title: "Save",
							text: "",
							icon:"save",
							onclick: function() {
								scope.$apply(function() {
									saveEdit(0); // blur and save
								});
							}
						});
						ed.addButton('cancelButton', {
							title: "Cancel",
							text: "",
							icon:"cancel",
							onclick: function() {
								scope.$apply(function() {
									saveEdit(3); // blur and cancel
								});
							}
						});
					}
				});

				editing = true;
				$('#tinyText'+id).addClass("ade-editing").removeClass('ade-hover');

				// $('.ade-toolbar').on('click.ADE', function() {
				// 	place();
				// });

				// save when user blurs out of text editor
				// listen to clicks on all elements on page
				// in a timer to prevent clicks on read popup from bleeding through
				setTimeout(function() {
					/* Note: Adding any touch event listener (touchend, touchstart) cause iOS to 
						delay the placement of the cursor on tap and instead requires
						a tap+hold to place cursor. We need the touch event to save on an
						external tap (document.click isn't called on ios). 
						Can't find a way around this.
					*/
					$(document).on('click.ADE touchend.ADE', function(e) {
						scope.$apply(function() {
							outerBlur(e);
						});
					});					
				});

			};

			//When the mouse enters, show the exanded text
			var mousein = function()  {
				// console.log("mouse in",adeId,editing);
				if(editing) return; //dont display read version if editing
				window.clearTimeout(timeout);
				
				//if any other popup is open in edit mode, don't do this view
				if (angular.element('.ade-toolbar').length) return;

				//immediatly hide any other expanded text fields 
				$('.ade-toolbar').remove();
				$('.ade-content').remove();
				$('.ade-rich').remove();
				
				viewRichText();
			};

			//if the mouse leaves, hide the expanded note view if in read mode
			var mouseout = function() {		
				// console.log("mouse out",adeId,editing);		
				if(editing) return;
				window.clearTimeout(timeout);
				timeout = window.setTimeout(hideDiv,500);
			};

			var hideDiv = function() { 
				$("#tinyToolbar"+id).remove();
				$('#tinyText'+id).removeClass('ade-editing').removeClass('ade-hover');
				window.setTimeout(function() {
					$("#tinyText"+id).remove();
					$('#ade-rich'+id).remove();
					destroy();
				},210);
			};
			
			//handles clicks on the read version of the data
			var mouseclick = function() {
				// console.log("mouse click",adeId,editing);	
				if(editing) return;
				window.clearTimeout(timeout);
				editing = true;
				exit = 0;

				adeId = scope.adeId;

				scope.$apply(function() {
					ADE.begin(adeId);
				});

				editRichText();
			};

			//sets up click, mouse enter and mouse leave events on the original element for preview and edit
			var setupElementEvents = function() {
				// console.log("setup",adeId,editing);
				element.on('mouseenter.ADE', mousein);
				
				if(!readonly) {
					element.on('click.ADE', mousein);

					//handles enter keydown on the read version of the data
					element.on('keydown.ADE', function(e) {
						if (e.keyCode === 13) { // enter
							mousein();
						} else if (e.keyCode === 9 || e.keyCode === 27) { // tab, esc
							hideDiv();
						}
					});
				}
			};

			setupElementEvents();

			//A callback to observe for changes to the id and save edit
			//The model will still be connected, so it is safe, but don't want to cause problems
			var observeID = function(value) {
				 //this gets called even when the value hasn't changed, 
				 //so we need to check for changes ourselves
				 if(editing && adeId!==value) saveEdit(3);
				 else if(adeId!==value) ADE.hidePopup(element);
			};

			//If ID changes during edit, something bad happened. No longer editing the right thing. Cancel
			stopObserving = attrs.$observe('adeId', observeID);

			var destroy = function() {
				// console.log("destroy",adeId);
				$(document).off('click.ADE');
				$(document).off('touchend.ADE');
			};
			
			scope.$on('ADE-hideall', function() {
				// console.log("hide",adeId,editing);
				if(editing) saveEdit(0);
			});

			scope.$on('$destroy', function() { //need to clean up the event watchers when the scope is destroyed
				destroy();

				if(element) element.off();

				if(stopObserving && stopObserving!=observeID) { //Angualar <=1.2 returns callback, not deregister fn
					stopObserving();
					stopObserving = null;
				} else {
					delete attrs.$$observers['adeId'];
				}
			});

			//need to watch the model for changes
			scope.$watch(function(scope) {
				return scope.ngModel;
			}, function () {
				makeHTML();
			});

		}
	};
}]);
