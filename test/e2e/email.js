'use strict';
angular.scenario.dsl('appElement', function() {
    return function(selector, fn) {
        return this.addFutureAction('element ' + selector, function($window, $document, done) {
            fn.call(this, $window.angular.element(selector));
            done();
        });
    };
});

describe('email', function() {

    beforeEach(function() {
        browser().navigateTo('../../app/email/index.html');
    });


    it('should render 2 controls', function() {
        var elm = element('.ade-editable');
        expect(elm.count()).toEqual(2);
    });

    it('should go into edit mode', function() {
        var elm = element('.ade-editable');
        elm.click();
        expect(element('.ade-editable + input').count()).toEqual(1);
    });

    it('should show a popup on click', function() {
        element('.ade-editable:contains(admin)').click();
        expect(element('.ade-editable + div').count()).toEqual(1);
    });

    it('should go into edit mode after clicking edit button', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        expect(element('.ade-editable + input').count()).toEqual(1);
    });

    it('should detect ENTER key', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.trigger({ type : 'keypress', keyCode: 13 });
        });
        expect(element('.ade-editable + input').count()).toEqual(0);
    });

    it('should edit/save entry with ENTER', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keypress', keyCode: 13 });
        });
        expect(element('.ade-editable').html()).
            toBe('<a href="mailto:admin2@toodledo.com">admin2@toodledo.com</a>');
        expect(element('.ade-editable + input').count()).toEqual(0);
    });

    it('should detect TAB key', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.trigger({ type : 'keydown', keyCode: 9 });
        });
        expect(element('.ade-editable + input').count()).toEqual(0);
    });

    it('should edit/save entry with TAB', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keydown', keyCode: 9 });
        });
        expect(element('.ade-editable').html()).
            toBe('<a href="mailto:admin2@toodledo.com">admin2@toodledo.com</a>');
        expect(element('.ade-editable + input').count()).toEqual(0);
    });

    it('should detect ESC key', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.trigger({ type : 'keydown', keyCode: 27 });
        });
        expect(element('.ade-editable + input').count()).toEqual(0);
    });

    it('should abort editing entry', function() {
        element('.ade-editable:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editable + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keydown', keyCode: 27 });
        });
        expect(element('.ade-editable').html()).
            toBe('<a href="mailto:admin@toodledo.com">admin@toodledo.com</a>');
        expect(element('.ade-editable + input').count()).toEqual(0);
    });
});