/**
 * Customizer JavaScript for BilliardToday New Theme
 */

(function($) {
    'use strict';

    // Update site title in real time
    wp.customize('blogname', function(value) {
        value.bind(function(newval) {
            $('.site-title a').text(newval);
        });
    });

    // Update site description in real time
    wp.customize('blogdescription', function(value) {
        value.bind(function(newval) {
            $('.site-description').text(newval);
        });
    });

    // Update header text color in real time
    wp.customize('header_textcolor', function(value) {
        value.bind(function(newval) {
            if ('blank' === newval) {
                $('.site-title, .site-description').css({
                    'clip': 'rect(1px, 1px, 1px, 1px)',
                    'position': 'absolute'
                });
            } else {
                $('.site-title, .site-description').css({
                    'clip': 'auto',
                    'position': 'static'
                });
                $('.site-title a, .site-description').css({
                    'color': newval
                });
            }
        });
    });

    // Update primary color in real time
    wp.customize('primary_color', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-purple', newval);
            
            // Update gradient backgrounds
            $('.btn-primary, .nav-cta').css({
                'background': 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize.value('secondary_color')() + ' 100%)'
            });
            
            // Update hero title gradient
            $('.hero-title').css({
                'background': 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize.value('secondary_color')() + ' 50%, ' + wp.customize.value('accent_color')() + ' 100%)',
                '-webkit-background-clip': 'text',
                '-webkit-text-fill-color': 'transparent',
                'background-clip': 'text'
            });
        });
    });

    // Update secondary color in real time
    wp.customize('secondary_color', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-pink', newval);
            
            // Update gradient backgrounds
            $('.btn-primary, .nav-cta').css({
                'background': 'linear-gradient(135deg, ' + wp.customize.value('primary_color')() + ' 0%, ' + newval + ' 100%)'
            });
            
            // Update hero title gradient
            $('.hero-title').css({
                'background': 'linear-gradient(135deg, ' + wp.customize.value('primary_color')() + ' 0%, ' + newval + ' 50%, ' + wp.customize.value('accent_color')() + ' 100%)',
                '-webkit-background-clip': 'text',
                '-webkit-text-fill-color': 'transparent',
                'background-clip': 'text'
            });
        });
    });

    // Update accent color in real time
    wp.customize('accent_color', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-cyan', newval);
            
            // Update elements with accent color
            $('.feature-icon:hover, .stat-icon:hover').css({
                'background': 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize.value('primary_color')() + ' 100%)'
            });
            
            // Update hero title gradient
            $('.hero-title').css({
                'background': 'linear-gradient(135deg, ' + wp.customize.value('primary_color')() + ' 0%, ' + wp.customize.value('secondary_color')() + ' 50%, ' + newval + ' 100%)',
                '-webkit-background-clip': 'text',
                '-webkit-text-fill-color': 'transparent',
                'background-clip': 'text'
            });
        });
    });

    // Update background color in real time
    wp.customize('bg_primary', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--bg-primary', newval);
            $('body').css('background', newval);
        });
    });

    // Update font family in real time
    wp.customize('font_family', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--font-primary', "'" + newval + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
            $('body').css('font-family', "'" + newval + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
        });
    });

    // Update logo in real time
    wp.customize('custom_logo', function(value) {
        value.bind(function(newval) {
            if (newval) {
                $('.logo').find('img').attr('src', newval);
            } else {
                // Show fallback logo
                $('.logo').find('img').remove();
            }
        });
    });

    // Toggle site title display
    wp.customize('display_site_title', function(value) {
        value.bind(function(newval) {
            if (newval) {
                $('.site-title').show();
            } else {
                $('.site-title').hide();
            }
        });
    });

    // Update copyright text in real time
    wp.customize('copyright_text', function(value) {
        value.bind(function(newval) {
            $('.footer-bottom p').html(newval);
        });
    });

    // Update social links in real time
    wp.customize('facebook_url', function(value) {
        value.bind(function(newval) {
            var facebookLink = $('.social-link[aria-label="Facebook"]');
            if (newval) {
                if (facebookLink.length === 0) {
                    // Add Facebook link if it doesn't exist
                    $('.footer-social').append(
                        '<a href="' + newval + '" class="social-link" aria-label="Facebook" target="_blank">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                        '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>' +
                        '</svg>' +
                        '</a>'
                    );
                } else {
                    facebookLink.attr('href', newval);
                }
            } else {
                facebookLink.remove();
            }
        });
    });

    wp.customize('twitter_url', function(value) {
        value.bind(function(newval) {
            var twitterLink = $('.social-link[aria-label="Twitter"]');
            if (newval) {
                if (twitterLink.length === 0) {
                    // Add Twitter link if it doesn't exist
                    $('.footer-social').append(
                        '<a href="' + newval + '" class="social-link" aria-label="Twitter" target="_blank">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                        '<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>' +
                        '</svg>' +
                        '</a>'
                    );
                } else {
                    twitterLink.attr('href', newval);
                }
            } else {
                twitterLink.remove();
            }
        });
    });

    wp.customize('linkedin_url', function(value) {
        value.bind(function(newval) {
            var linkedinLink = $('.social-link[aria-label="LinkedIn"]');
            if (newval) {
                if (linkedinLink.length === 0) {
                    // Add LinkedIn link if it doesn't exist
                    $('.footer-social').append(
                        '<a href="' + newval + '" class="social-link" aria-label="LinkedIn" target="_blank">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                        '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>' +
                        '</svg>' +
                        '</a>'
                    );
                } else {
                    linkedinLink.attr('href', newval);
                }
            } else {
                linkedinLink.remove();
            }
        });
    });

    // Add smooth transitions for color changes
    var style = $('<style>')
        .prop('type', 'text/css')
        .html('body, .btn-primary, .nav-cta, .feature-icon, .stat-icon, .hero-title { transition: all 0.3s ease; }')
        .appendTo('head');

    // Initialize custom controls
    function initCustomControls() {
        // Add color picker enhancements
        $('.wp-color-result').each(function() {
            var $this = $(this);
            $this.on('click', function() {
                // Custom color picker logic
            });
        });

        // Add range slider enhancements
        $('input[type="range"]').each(function() {
            var $this = $(this);
            var $valueDisplay = $('<span class="range-value">' + $this.val() + '</span>');
            $this.after($valueDisplay);
            
            $this.on('input', function() {
                $valueDisplay.text($this.val());
            });
        });
    }

    // Initialize when customizer is ready
    wp.customize.bind('ready', function() {
        initCustomControls();
    });

    // Add custom preview styles
    function addPreviewStyles() {
        var previewStyles = $('<style>')
            .prop('type', 'text/css')
            .html(`
                .customize-partial-edit-shortcuts-shown .customize-partial-edit-shortcut button {
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    color: white;
                    font-size: 12px;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
                }
                
                .customize-partial-edit-shortcuts-shown .customize-partial-edit-shortcut button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                }
                
                .customizer-loading {
                    opacity: 0.6;
                    pointer-events: none;
                }
                
                .customizer-loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    margin: -10px 0 0 -10px;
                    border: 2px solid transparent;
                    border-top: 2px solid #8b5cf6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');
    }

    // Add preview styles when ready
    wp.customize.bind('preview-ready', function() {
        addPreviewStyles();
    });

    // Handle section navigation
    function handleSectionNavigation() {
        $('.customize-section-back').on('click', function() {
            // Custom back navigation logic
        });
    }

    // Initialize section navigation
    handleSectionNavigation();

    // Add custom validation
    function addCustomValidation() {
        // Validate URLs
        wp.customize('facebook_url', function(setting) {
            setting.validate = function(value) {
                if (value && !isValidUrl(value)) {
                    return new wp.customize.Validation('invalid_url', 'Please enter a valid URL');
                }
                return value;
            };
        });

        wp.customize('twitter_url', function(setting) {
            setting.validate = function(value) {
                if (value && !isValidUrl(value)) {
                    return new wp.customize.Validation('invalid_url', 'Please enter a valid URL');
                }
                return value;
            };
        });

        wp.customize('linkedin_url', function(setting) {
            setting.validate = function(value) {
                if (value && !isValidUrl(value)) {
                    return new wp.customize.Validation('invalid_url', 'Please enter a valid URL');
                }
                return value;
            };
        });
    }

    // URL validation helper
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Initialize custom validation
    addCustomValidation();

    // Add device preview support
    function addDevicePreviewSupport() {
        wp.customize.bind('ready', function() {
            // Add custom device preview logic
            $('.devices-wrapper').on('click', function() {
                // Handle device switching
            });
        });
    }

    // Initialize device preview support
    addDevicePreviewSupport();

})(jQuery);
