/* ==================================================================
 AngularJS Datatype Editor - Toggle
 A directive to toggle a star, checkbox or other icon

 Usage:
 <a ade-toggle ade-id="1234" ade-class="ade-star" ng-model="data"></a>

Config:

ade-id:
	If this id is set, it will be used in messages broadcast to the app on state changes.
ade-class:
	A custom class to give to the div so that you can use your own images
ade-readonly:
	If you don't want the stars to be editable


 Messages:
 name: ADE-start
 data: id from config

 name: ADE-finish
 data: {id from config, old value, new value}

 ------------------------------------------------------------------*/

angular.module('ADE').directive('adeTag', 
 ['ADE', '$compile', '$filter', '$sanitize', 
 function(ADE, $compile, $filter, $sanitize) {
	return {
		require: '?ngModel', //optional dependency for ngModel
		restrict: 'A', //Attribute declaration eg: <div ade-toggle=""></div>

		scope: {
			adeTag: "@",
			adeId: "@",
			adeClass: "@",
			adeQuery: "&",
			adeReadonly: "@",
			ngModel: "="
		},

		//The link step (after compile)
		link: function(scope, element, attrs) {
			var editing = false; //are we in edit mode or not
			var input = null; //a reference to the input DOM object
			var readonly = false;
			var exit = 0; //0=click, 1=tab, -1= shift tab, 2=return, -2=shift return, 3=esc. controls if you exited the field so you can focus the next field if appropriate
			var stopObserving = null;
			var adeId = scope.adeId;

			if(scope.adeReadonly!==undefined && scope.adeReadonly=="1") readonly = true;

			scope.query = function(val) { //called by ng-tags-input on each keystroke to get the autocomplete
				return scope.adeQuery({val:val, listId: scope.adeTag});
			};
			scope.esc = function() { //called by ng-tags-input when esc key is pressed 
				destroy();

				ADE.done(adeId, scope.ngModel, scope.ngModel, 3);
			};
			scope.ret = function(e) {
				var exit = e.shiftKey ? -2 : 2;
				saveEdit(exit)
			};
			scope.blurred = function() {
				saveEdit(0)
			};


			//generates HTML for the star
			var makeHTML = function() {
				var html = "";

				if (scope.ngModel!==undefined) {
					if (angular.isString(scope.ngModel)) {
						html = scope.ngModel;
					} else if (angular.isArray(scope.ngModel)) {
						var html = '';
						$.each(scope.ngModel, function(i, v) {
							if (html) html += ', ';
							html += v;
						});
					}
				}
				html = $sanitize(html).replace(/<[^>]+>/gm, '');
				element.html(html);
			}

			//called once the edit is done, so we can save the new data and remove edit mode
			var saveEdit = function(exited) {
				var oldValue = scope.ngModel;
				exit = exited;

				if (exited != 3) { //don't save value on esc
					value = scope.tags;
					if (angular.isArray(value)) {
						if (value.length > 0) {
							//to have value stored as array
							var vals = [];
							angular.forEach(value, function(val, key) {
								vals.push(val.text);
							});
							value = vals;
						} else {
							value = '';
						}
					} else if (angular.isObject(value) && value.text) {
						value = value.text;
					} else {
						value = (value) ? value.text : '';
					}

					scope.ngModel = value;
				}

				destroy();

				ADE.done(adeId, oldValue, scope.ngModel, exit);
			};


			var clickHandler = function(e) {
				if (editing) return;
				editing = true;
				exit = 0;

				adeId = scope.adeId;
				ADE.begin(adeId);
				element.hide();


				var listId = '';
				if (scope.adeList) listId = scope.adeList; //data that is passed through to the query function

				var autocomplete = "query($query)";

				scope.tags = angular.copy(scope.ngModel);
				if (angular.isString(scope.tags)) scope.tags = scope.tags.split(',');

				var html = '<tags-input class="ade-tag-input" ng-model="tags" min-length="1" replace-spaces-with-dashes="false" enable-editing-last-tag="true" on-esc-key="esc()" on-ret-key="ret(e)" on-blurred="blurred()"><auto-complete source="'+autocomplete+'" min-length="1" load-on-empty="true" load-on-focus="true"></auto-complete></tags-input>';
				$compile(html)(scope).insertAfter(element);

				setTimeout(function() {
					input = $('.ade-tag-input .tag-list + input');
					input.focus();
				},100); //tag input needs little time to initialize before it can accept a focus


			};

			var focusHandler = function(e) {
				element.on('keypress.ADE', function(e) {
					if (e.keyCode == 13) { //return
						e.preventDefault();
						e.stopPropagation();
						element.click();
					}
				});
			};
			
			//setup events
			if(!readonly) {
				element.on('click.ADE', function(e) {
					scope.$apply(function() {
						clickHandler(e);
					})
				});
				element.on('focus.ADE',  function(e) {
					scope.$apply(function() {
						focusHandler(e);
					})
				});
				element.on('blur.ADE', function(e) {
					element.off('keypress.ADE');
				});
			}


			//A callback to observe for changes to the id and save edit
			//The model will still be connected, so it is safe, but don't want to cause problems
			var observeID = function(value) {
				 //this gets called even when the value hasn't changed, 
				 //so we need to check for changes ourselves
				 if(editing && adeId!==value) saveEdit(3);
			};

			//If ID changes during edit, something bad happened. No longer editing the right thing. Cancel
			stopObserving = attrs.$observe('adeId', observeID);

			var destroy = function() {
				element.show();

				if(input) {
					input.off('keypress.ADE');
				}
				$('.ade-tag-input').remove();

				editing = false;
			};

			scope.$on('$destroy', function() { //need to clean up the event watchers when the scope is destroyed
				destroy();

				if(element) {
					element.off('click.ADE');
					element.off('focus.ADE');
					element.off('blur.ADE');
					element.off('keypress.ADE');
				}

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