/**
 * Customizer JavaScript for BilliardToday Sport Fun Theme
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

    // Update primary orange color in real time
    wp.customize('primary_orange', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--primary-orange', newval);
            
            // Update gradient backgrounds
            var gradient = 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize('secondary_orange').get() + ' 100%)';
            document.documentElement.style.setProperty('--gradient-primary', gradient);
            
            // Update buttons
            $('.btn-primary, .nav-cta').css({
                'background': gradient
            });
            
            // Update logo icon
            $('.logo-icon').css({
                'background': 'linear-gradient(135deg, #ff006e 0%, ' + newval + ' 25%, ' + wp.customize('accent_yellow').get() + ' 50%, #06ffa5 75%, #00d9ff 100%)'
            });
            
            // Update feature icons
            $('.feature-icon').css({
                'background': gradient
            });
            
            // Update stat numbers
            $('.stat-number').css({
                'color': newval
            });
        });
    });

    // Update secondary orange color in real time
    wp.customize('secondary_orange', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--secondary-orange', newval);
            
            // Update gradient backgrounds
            var gradient = 'linear-gradient(135deg, ' + wp.customize('primary_orange').get() + ' 0%, ' + newval + ' 100%)';
            document.documentElement.style.setProperty('--gradient-primary', gradient);
            
            // Update buttons
            $('.btn-primary, .nav-cta').css({
                'background': gradient
            });
            
            // Update logo icon
            $('.logo-icon').css({
                'background': 'linear-gradient(135deg, #ff006e 0%, ' + wp.customize('primary_orange').get() + ' 25%, ' + wp.customize('accent_yellow').get() + ' 50%, #06ffa5 75%, #00d9ff 100%)'
            });
            
            // Update feature icons
            $('.feature-icon').css({
                'background': gradient
            });
        });
    });

    // Update accent yellow color in real time
    wp.customize('accent_yellow', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-yellow', newval);
            
            // Update gradient backgrounds
            var gradientSecondary = 'linear-gradient(135deg, ' + newval + ' 0%, #06ffa5 100%)';
            document.documentElement.style.setProperty('--gradient-secondary', gradientSecondary);
            
            // Update logo icon
            $('.logo-icon').css({
                'background': 'linear-gradient(135deg, #ff006e 0%, ' + wp.customize('primary_orange').get() + ' 25%, ' + newval + ' 50%, #06ffa5 75%, #00d9ff 100%)'
            });
            
            // Update secondary button
            $('.btn-secondary').css({
                'border-color': newval,
                'color': newval
            });
            
            $('.btn-secondary:hover').css({
                'background': newval,
                'color': 'white'
            });
        });
    });

    // Update accent green color in real time
    wp.customize('accent_green', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-green', newval);
            
            // Update gradient backgrounds
            var gradientSecondary = 'linear-gradient(135deg, ' + wp.customize('accent_yellow').get() + ' 0%, ' + newval + ' 100%)';
            document.documentElement.style.setProperty('--gradient-secondary', gradientSecondary);
            
            // Update logo icon
            $('.logo-icon').css({
                'background': 'linear-gradient(135deg, #ff006e 0%, ' + wp.customize('primary_orange').get() + ' 25%, ' + wp.customize('accent_yellow').get() + ' 50%, ' + newval + ' 75%, #00d9ff 100%)'
            });
        });
    });

    // Update accent blue color in real time
    wp.customize('accent_blue', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-blue', newval);
            
            // Update gradient backgrounds
            var gradientFun = 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize('accent_purple').get() + ' 100%)';
            document.documentElement.style.setProperty('--gradient-fun', gradientFun);
            
            // Update logo icon
            $('.logo-icon').css({
                'background': 'linear-gradient(135deg, #ff006e 0%, ' + wp.customize('primary_orange').get() + ' 25%, ' + wp.customize('accent_yellow').get() + ' 50%, ' + wp.customize('accent_green').get() + ' 75%, ' + newval + ' 100%)'
            });
        });
    });

    // Update accent purple color in real time
    wp.customize('accent_purple', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-purple', newval);
            
            // Update gradient backgrounds
            var gradientFun = 'linear-gradient(135deg, ' + wp.customize('accent_blue').get() + ' 0%, ' + newval + ' 100%)';
            document.documentElement.style.setProperty('--gradient-fun', gradientFun);
        });
    });

    // Update accent pink color in real time
    wp.customize('accent_pink', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--accent-pink', newval);
        });
    });

    // Update background colors in real time
    wp.customize('bg_primary_fun', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--bg-primary', newval);
            $('body').css('background', newval);
        });
    });

    wp.customize('bg_secondary_fun', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--bg-secondary', newval);
            $('.features').css('background', newval);
            $('.hero').css('background', 'linear-gradient(135deg, ' + newval + ' 0%, ' + wp.customize('bg_primary_fun').get() + ' 100%)');
        });
    });

    // Update text colors in real time
    wp.customize('text_primary_fun', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--text-primary', newval);
            
            // Update text elements
            $('h1, h2, h3, h4, h5, h6').css({
                'color': newval
            });
            
            $('.hero-title, .feature-title, .post-title a, .section-title').css({
                'color': newval
            });
        });
    });

    wp.customize('text_secondary_fun', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--text-secondary', newval);
            
            // Update muted text elements
            $('.hero-subtitle, .feature-description, .post-excerpt, .post-meta, .section-subtitle').css({
                'color': newval
            });
        });
    });

    // Update font family in real time
    wp.customize('font_family_fun', function(value) {
        value.bind(function(newval) {
            document.documentElement.style.setProperty('--font-primary', "'" + newval + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
            $('body').css('font-family', "'" + newval + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
        });
    });

    // Update font weight in real time
    wp.customize('font_weight_fun', function(value) {
        value.bind(function(newval) {
            $('body').css('font-weight', value);
            $('h1, h2, h3, h4, h5, h6').css('font-weight', value);
        });
    });

    // Update logo in real time
    wp.customize('custom_logo_fun', function(value) {
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
    wp.customize('display_site_title_fun', function(value) {
        value.bind(function(newval) {
            if (newval) {
                $('.site-title').show();
            } else {
                $('.site-title').hide();
            }
        });
    });

    // Update copyright text in real time
    wp.customize('copyright_text_fun', function(value) {
        value.bind(function(newval) {
            $('.footer-bottom p').html(newval);
        });
    });

    // Update social links in real time
    wp.customize('facebook_url_fun', function(value) {
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

    wp.customize('twitter_url_fun', function(value) {
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

    wp.customize('linkedin_url_fun', function(value) {
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

    // Update fun tagline in real time
    wp.customize('fun_tagline', function(value) {
        value.bind(function(newval) {
            $('.hero-subtitle').text(newval);
        });
    });

    // Update CTA button text in real time
    wp.customize('cta_button_text_fun', function(value) {
        value.bind(function(newval) {
            $('.btn-primary').each(function() {
                if ($(this).text().indexOf('Start') !== -1 || $(this).text().indexOf('Play') !== -1) {
                    $(this).text(newval);
                }
            });
        });
    });

    // Update demo button text in real time
    wp.customize('demo_button_text_fun', function(value) {
        value.bind(function(newval) {
            $('.btn-secondary').each(function() {
                if ($(this).text().indexOf('Demo') !== -1 || $(this).text().indexOf('Watch') !== -1) {
                    $(this).text(newval);
                }
            });
        });
    });

    // Update stats in real time
    wp.customize('stats_players_fun', function(value) {
        value.bind(function(newval) {
            $('.stat-item').first().find('.stat-number').text(newval);
        });
    });

    wp.customize('stats_events_fun', function(value) {
        value.bind(function(newval) {
            $('.stat-item').eq(1).find('.stat-number').text(newval);
        });
    });

    wp.customize('stats_matches_fun', function(value) {
        value.bind(function(newval) {
            $('.stat-item').eq(2).find('.stat-number').text(newval);
        });
    });

    wp.customize('stats_fun_factor', function(value) {
        value.bind(function(newval) {
            $('.stat-item').eq(3).find('.stat-number').text(newval);
        });
    });

    // Add sport fun transitions for color changes
    var style = $('<style>')
        .prop('type', 'text/css')
        .html('body, .btn-primary, .btn-secondary, .nav-cta, .feature-icon, .stat-icon, .hero-title, .logo-icon, .social-link, .feature-card, .post-card { transition: all 0.3s ease; }')
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
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
                    border: none;
                    border-radius: 50px;
                    width: 30px;
                    height: 30px;
                    color: white;
                    font-size: 12px;
                    box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
                }
                
                .customize-partial-edit-shortcuts-shown .customize-partial-edit-shortcut button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 32px rgba(255, 107, 53, 0.5);
                }
                
                .sport-fun-loading {
                    opacity: 0.7;
                    pointer-events: none;
                }
                
                .sport-fun-loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 16px;
                    height: 16px;
                    margin: -8px 0 0 -8px;
                    border: 2px solid transparent;
                    border-top: 2px solid #ff6b35;
                    border-radius: 50%;
                    animation: sportFunSpin 1s linear infinite;
                }
                
                @keyframes sportFunSpin {
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
        wp.customize('facebook_url_fun', function(setting) {
            setting.validate = function(value) {
                if (value && !isValidUrl(value)) {
                    return new wp.customize.Validation('invalid_url', 'Please enter a valid URL');
                }
                return value;
            };
        });

        wp.customize('twitter_url_fun', function(setting) {
            setting.validate = function(value) {
                if (value && !isValidUrl(value)) {
                    return new wp.customize.Validation('invalid_url', 'Please enter a valid URL');
                }
                return value;
            };
        });

        wp.customize('linkedin_url_fun', function(setting) {
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

    // Add sport fun specific customizer enhancements
    function addSportFunCustomizerEnhancements() {
        // Add sport fun color palette
        var sportFunColors = [
            { name: 'Primary Orange', value: '#ff6b35' },
            { name: 'Secondary Orange', value: '#ff8c42' },
            { name: 'Accent Yellow', value: '#ffd166' },
            { name: 'Accent Green', value: '#06ffa5' },
            { name: 'Accent Blue', value: '#00d9ff' },
            { name: 'Accent Purple', value: '#8b5cf6' },
            { name: 'Accent Pink', value: '#ff006e' },
            { name: 'White', value: '#ffffff' },
            { name: 'Gray 100', value: '#f5f5f5' },
            { name: 'Gray 700', value: '#404040' },
            { name: 'Gray 900', value: '#171717' }
        ];

        // Add color palette to color pickers
        $('.wp-color-result').each(function() {
            var $this = $(this);
            var $palette = $('<div class="sport-fun-color-palette"></div>');
            
            sportFunColors.forEach(function(color) {
                var $colorSwatch = $('<div class="color-swatch" data-color="' + color.value + '" title="' + color.name + '"></div>');
                $colorSwatch.css('background-color', color.value);
                $palette.append($colorSwatch);
            });
            
            $this.after($palette);
            
            // Handle color swatch clicks
            $palette.find('.color-swatch').on('click', function() {
                var selectedColor = $(this).data('color');
                // Trigger color change in customizer
                $this.trigger('click');
                $('.wp-color-picker').val(selectedColor).trigger('change');
            });
        });

        // Add palette styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .sport-fun-color-palette {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                    flex-wrap: wrap;
                }
                
                .sport-fun-color-palette .color-swatch {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid #e5e5e5;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .sport-fun-color-palette .color-swatch:hover {
                    transform: scale(1.1);
                    border-color: #ff6b35;
                    box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
                }
                
                .sport-fun-color-palette .color-swatch:active {
                    transform: scale(0.95);
                }
            `)
            .appendTo('head');
    }

    // Initialize sport fun customizer enhancements
    addSportFunCustomizerEnhancements();

    // Add gradient preview for sport fun colors
    function addGradientPreview() {
        wp.customize('primary_orange', function(setting) {
            setting.bind(function(newval) {
                var secondaryColor = wp.customize('secondary_orange').get();
                var gradient = 'linear-gradient(135deg, ' + newval + ' 0%, ' + secondaryColor + ' 100%)';
                
                // Update gradient preview
                $('.gradient-preview').css('background', gradient);
            });
        });

        wp.customize('secondary_orange', function(setting) {
            setting.bind(function(newval) {
                var primaryColor = wp.customize('primary_orange').get();
                var gradient = 'linear-gradient(135deg, ' + primaryColor + ' 0%, ' + newval + ' 100%)';
                
                // Update gradient preview
                $('.gradient-preview').css('background', gradient);
            });
        });
    }

    // Initialize gradient preview
    addGradientPreview();

})(jQuery);
