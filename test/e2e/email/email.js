'use strict';

describe('email', function() {

    beforeEach(function() {
        browser().navigateTo('../../app/email/index.html');
    });

    it('should edit/save entry with ENTER', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keydown', keyCode: 13 });
        });
        expect(element('.ade-editme').html()).
            toBe('<a href="mailto:admin2@toodledo.com">admin2@toodledo.com</a>');
        expect(element('.ade-editme + input').count()).toEqual(0);
    });

    it('should edit/save entry with TAB', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keydown', keyCode: 9 });
        });
        expect(element('.ade-editme').html()).
            toBe('<a href="mailto:admin2@toodledo.com">admin2@toodledo.com</a>');
        expect(element('.ade-editme + input').count()).toEqual(0);
    });

    it('should go into edit mode after clicking edit button', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        expect(element('.ade-editme + input').count()).toEqual(1);
    });


    it('should render 2 controls', function() {
        expect(element('.ade-editme').count()).toEqual(2);
    });

    it('should go into edit mode', function() {
        element('.ade-editme').click();
        expect(element('.ade-editme + input').count()).toEqual(1);
    });

    it('should show a popup on click', function() {
        element('.ade-editme:contains(admin)').click();
        expect(element('.ade-editme + div').count()).toEqual(1);
    });

    it('should echo invalid input', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.val('abc');
            elm.trigger({ type : 'keydown', keyCode: 13 });
        });
        expect(element('.ade-editme:eq(0)').text()).toBe('abc');
        expect(element('.ade-editme + input').count()).toEqual(0);
    });

    it('should detect ENTER key', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.trigger({ type : 'keydown', keyCode: 13 });
        });
        expect(element('.ade-editme + input').count()).toEqual(0);
    });
    
    it('should detect TAB key', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.trigger({ type : 'keydown', keyCode: 9 });
        });
        expect(element('.ade-editme + input').count()).toEqual(0);
    });

    
    it('should detect ESC key', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.trigger({ type : 'keydown', keyCode: 27 });
        });
        expect(element('.ade-editme + input').count()).toEqual(0);
    });

    it('should abort editing entry', function() {
        element('.ade-editme:contains(admin)').click();
        element('a:contains(Edit)').click();
        appElement('.ade-editme + input', function(elm) {
            elm.val('admin2@toodledo.com');
            elm.trigger({ type : 'keydown', keyCode: 27 });
        });
        expect(element('.ade-editme').html()).
            toBe('<a href="mailto:admin@toodledo.com">admin@toodledo.com</a>');
        expect(element('.ade-editme + input').count()).toEqual(0);
    });
});