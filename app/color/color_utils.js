angular.module('ADE').factory('colorUtils', function() {
    'use strict';

    function parseHex(string, expand) {
        if (typeof string !== 'string') return '';
        string = string.replace(/^#/g, '');
        if (!string.match(/^[A-F0-9]{3,6}/ig)) return '';
        if (string.length !== 3 && string.length !== 6) return '';
        if (string.length === 3 && expand) {
            string = string[0] + string[0] + string[1] + string[1] + string[2] + string[2];
        }
        return '#' + string;
    }

    function hsb2rgb(hsb) {
        var rgb = {};
        var h = Math.round(hsb.h);
        var s = Math.round(hsb.s * 255 / 100);
        var v = Math.round(hsb.b * 255 / 100);
        if (s === 0) {
            rgb.r = rgb.g = rgb.b = v;
        } else {
            var t1 = v;
            var t2 = (255 - s) * v / 255;
            var t3 = (t1 - t2) * (h % 60) / 60;
            if (h === 360) h = 0;
            if (h < 60) {
                rgb.r = t1;
                rgb.b = t2;
                rgb.g = t2 + t3;
            } else if (h < 120) {
                rgb.g = t1;
                rgb.b = t2;
                rgb.r = t1 - t3;
            } else if (h < 180) {
                rgb.g = t1;
                rgb.r = t2;
                rgb.b = t2 + t3;
            } else if (h < 240) {
                rgb.b = t1;
                rgb.r = t2;
                rgb.g = t1 - t3;
            } else if (h < 300) {
                rgb.b = t1;
                rgb.g = t2;
                rgb.r = t2 + t3;
            } else if (h < 360) {
                rgb.r = t1;
                rgb.g = t2;
                rgb.b = t1 - t3;
            } else {
                rgb.r = 0;
                rgb.g = 0;
                rgb.b = 0;
            }
        }
        return {
            r: Math.round(rgb.r),
            g: Math.round(rgb.g),
            b: Math.round(rgb.b)
        };
    }

    function hex2hsb(hex) {
        var hsb = rgb2hsb(hex2rgb(hex));
        if (hsb.s === 0) hsb.h = 360;
        return hsb;
    }

    function rgb2hex(rgb) {
        var hex = [rgb.r.toString(16), rgb.g.toString(16), rgb.b.toString(16)];
        $.each(hex, function(nr, val) {
            if (val.length === 1) hex[nr] = '0' + val;
        });
        return '#' + hex.join('');
    }

    function hsb2hex(hsb) {
        return rgb2hex(hsb2rgb(hsb));
    }

    function hex2rgb(hex) {
        hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
        return {
            r: hex >> 16,
            g: (hex & 0x00FF00) >> 8,
            b: (hex & 0x0000FF)
        };
    }

    function rgb2hsb(rgb) {
        var hsb = {
            h: 0,
            s: 0,
            b: 0
        };
        var min = Math.min(rgb.r, rgb.g, rgb.b);
        var max = Math.max(rgb.r, rgb.g, rgb.b);
        var delta = max - min;
        hsb.b = max;
        hsb.s = max !== 0 ? 255 * delta / max : 0;
        if (hsb.s !== 0) {
            if (rgb.r === max) {
                hsb.h = (rgb.g - rgb.b) / delta;
            } else if (rgb.g === max) {
                hsb.h = 2 + (rgb.b - rgb.r) / delta;
            } else {
                hsb.h = 4 + (rgb.r - rgb.g) / delta;
            }
        } else {
            hsb.h = -1;
        }
        hsb.h *= 60;
        if (hsb.h < 0) {
            hsb.h += 360;
        }
        hsb.s *= 100 / 255;
        hsb.b *= 100 / 255;
        return hsb;
    }

    function colorDistance(hex1, hex2) {
        var c1 = hex2rgb(hex1);
        var c2 = hex2rgb(hex2);

        var sum = Math.pow(1*(c2.r-c1.r),2)+Math.pow(1*(c2.g-c1.g),2)+Math.pow(1*(c2.b-c1.b),2);
        var score = Math.sqrt(sum);

        console.log(hex1,hex2,score);

        return score;
    }

    return {
        parseHex: parseHex,
        hex2hsb: hex2hsb,
        hsb2hex: hsb2hex,
        colorDistance: colorDistance
    };
});