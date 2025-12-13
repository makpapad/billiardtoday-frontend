/**
 * BilliardToday Minimal Theme JavaScript
 */

(function($) {
    'use strict';

    // DOM Ready
    $(document).ready(function() {
        // Smooth scrolling for anchor links
        $('a[href^="#"]').on('click', function(event) {
            var target = $(this.getAttribute('href'));
            if (target.length) {
                event.preventDefault();
                $('html, body').stop().animate({
                    scrollTop: target.offset().top - 80
                }, 800, 'easeInOutCubic');
            }
        });

        // Subtle parallax effect for hero section
        $(window).on('scroll', function() {
            var scrolled = $(window).scrollTop();
            $('.hero').css('transform', 'translateY(' + (scrolled * 0.2) + 'px)');
            
            // Animate feature cards on scroll
            $('.feature-card').each(function() {
                var elementTop = $(this).offset().top;
                var elementBottom = elementTop + $(this).outerHeight();
                var viewportTop = $(window).scrollTop();
                var viewportBottom = viewportTop + $(window).height();

                if (elementBottom > viewportTop && elementTop < viewportBottom) {
                    $(this).addClass('animate-in');
                }
            });
        });

        // Minimal hover effects
        $('.feature-card').on('mouseenter', function() {
            $(this).find('.feature-icon').addClass('animate-minimal');
        }).on('mouseleave', function() {
            $(this).find('.feature-icon').removeClass('animate-minimal');
        });

        // Mobile menu toggle
        $('.mobile-menu-toggle').on('click', function() {
            $('.nav-menu').toggleClass('active');
            $(this).toggleClass('active');
        });

        // Add minimal CSS animations
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes minimalPulse {
                    0%, 100% { 
                        transform: scale(1); 
                        opacity: 0.8;
                    }
                    50% { 
                        transform: scale(1.05); 
                        opacity: 1;
                    }
                }
                
                .animate-in {
                    animation: fadeInUp 0.6s ease-out;
                }
                
                .animate-minimal {
                    animation: minimalPulse 2s ease-in-out infinite;
                }
                
                .mobile-menu-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 4px;
                    transition: background-color 0.2s ease;
                }
                
                .mobile-menu-toggle:hover {
                    background-color: var(--bg-primary);
                }
                
                @media (max-width: 768px) {
                    .mobile-menu-toggle {
                        display: block;
                    }
                    
                    .nav-menu {
                        position: fixed;
                        top: 70px;
                        left: 0;
                        right: 0;
                        background: var(--bg-secondary);
                        flex-direction: column;
                        padding: 2rem;
                        transform: translateY(-100%);
                        transition: transform 0.3s ease;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    
                    .nav-menu.active {
                        transform: translateY(0);
                    }
                }
            `)
            .appendTo('head');

        // Add mobile menu toggle to navigation
        if ($(window).width() <= 768) {
            $('.nav-container').append('<button class="mobile-menu-toggle">☰</button>');
        }

        // Intersection Observer for minimal animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -30px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements
            $('.feature-card, .post-card').each(function() {
                observer.observe(this);
            });
        }

        // Add minimal hover effect to buttons
        $('.btn-primary, .btn-secondary, .nav-cta').on('mouseenter', function() {
            $(this).addClass('minimal-hover');
        }).on('mouseleave', function() {
            $(this).removeClass('minimal-hover');
        });

        // Add minimal hover effect CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .minimal-hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
                
                .btn-primary:hover,
                .btn-secondary:hover,
                .nav-cta:hover {
                    transition: all 0.2s ease;
                }
            `)
            .appendTo('head');

        // Form validation (if forms exist)
        $('form').on('submit', function(e) {
            var $form = $(this);
            var isValid = true;

            $form.find('input[required], textarea[required], select[required]').each(function() {
                if (!$(this).val()) {
                    isValid = false;
                    $(this).addClass('error');
                } else {
                    $(this).removeClass('error');
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('Please fill in all required fields.');
            }
        });

        // Add minimal error styling
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .error {
                    border-color: var(--text-muted) !important;
                    box-shadow: 0 0 0 1px var(--text-muted) !important;
                }
            `)
            .appendTo('head');

        // Lazy loading for images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            $('.post-thumbnail img').each(function() {
                if ($(this).hasClass('lazy')) {
                    imageObserver.observe(this);
                }
            });
        }

        // Theme switcher functionality
        initMinimalThemeSwitcher();

        // Performance optimization: Debounce scroll events
        var scrollTimer;
        $(window).on('scroll', function() {
            if (scrollTimer) {
                clearTimeout(scrollTimer);
            }
            scrollTimer = setTimeout(function() {
                // Scroll-based animations here
            }, 100);
        });

        // Add minimal loading states
        $('.btn-primary, .btn-secondary').on('click', function() {
            var $btn = $(this);
            var originalText = $btn.html();
            
            $btn.addClass('loading').prop('disabled', true);
            
            // Simulate loading (remove this in production)
            setTimeout(function() {
                $btn.removeClass('loading').prop('disabled', false).html(originalText);
            }, 1500);
        });

        // Minimal loading state CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .loading {
                    position: relative;
                    color: transparent !important;
                }
                
                .loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 16px;
                    height: 16px;
                    margin: -8px 0 0 -8px;
                    border: 1px solid transparent;
                    border-top: 1px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');

        // Add minimal theme specific enhancements
        addMinimalThemeEnhancements();
    });

    // Initialize theme switcher
    function initMinimalThemeSwitcher() {
        // Check if theme switcher should be visible
        if ($('body').hasClass('admin-bar') && $('#wp-admin-bar-theme-switcher').length) {
            // Theme switcher is already handled by PHP
            return;
        }

        // Add floating theme switcher for demo purposes
        if (window.location.search.includes('demo=true')) {
            addFloatingSwitcher();
        }
    }

    // Add floating theme switcher
    function addFloatingSwitcher() {
        var switcherHtml = `
            <div class="floating-theme-switcher">
                <button class="switcher-toggle">🎨</button>
                <div class="switcher-menu">
                    <h4>Switch Theme</h4>
                    <a href="#" data-theme="billiardtoday-original">🌙 Original</a>
                    <a href="#" data-theme="billiardtoday-original-light">☀️ Original Light</a>
                    <a href="#" data-theme="billiardtoday-new">🌟 New</a>
                    <a href="#" data-theme="billiardtoday-light">☀️ Light</a>
                    <a href="#" data-theme="billiardtoday-minimal">📋 Minimal</a>
                    <a href="#" data-theme="billiardtoday-dark-modern">🌚 Dark Modern</a>
                    <a href="#" data-theme="billiardtoday-corporate">🏢 Corporate</a>
                    <a href="#" data-theme="billiardtoday-sport-fun">🎮 Sport Fun</a>
                </div>
            </div>
        `;

        $('body').append(switcherHtml);

        // Add minimal switcher styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .floating-theme-switcher {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .switcher-toggle {
                    width: 40px;
                    height: 40px;
                    border-radius: 4px;
                    background: var(--accent-primary);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s ease;
                }
                
                .switcher-toggle:hover {
                    transform: scale(1.05);
                }
                
                .switcher-menu {
                    position: absolute;
                    top: 50px;
                    right: 0;
                    background: var(--bg-secondary);
                    border: 1px solid var(--bg-border);
                    border-radius: 4px;
                    padding: 1rem;
                    min-width: 180px;
                    display: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .switcher-menu.show {
                    display: block;
                }
                
                .switcher-menu h4 {
                    color: var(--text-primary);
                    margin: 0 0 0.75rem 0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 500;
                }
                
                .switcher-menu a {
                    display: block;
                    padding: 0.5rem;
                    color: var(--text-muted);
                    text-decoration: none;
                    border-radius: 2px;
                    margin-bottom: 0.25rem;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                }
                
                .switcher-menu a:hover {
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }
                
                .switcher-menu a.active {
                    background: var(--accent-primary);
                    color: white;
                }
            `)
            .appendTo('head');

        // Switcher functionality
        $('.switcher-toggle').on('click', function() {
            $('.switcher-menu').toggleClass('show');
        });

        // Close switcher when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.floating-theme-switcher').length) {
                $('.switcher-menu').removeClass('show');
            }
        });

        // Handle theme switching
        $('.switcher-menu a').on('click', function(e) {
            e.preventDefault();
            var theme = $(this).data('theme');
            
            // In a real implementation, this would switch the theme
            // For demo, just show a message
            alert('Switching to: ' + theme);
        });
    }

    // Add minimal theme specific enhancements
    function addMinimalThemeEnhancements() {
        // Add subtle animations for minimal theme
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .hero {
                    transition: transform 0.3s ease;
                }
                
                .feature-card {
                    transition: border-color 0.2s ease, transform 0.2s ease;
                }
                
                .feature-card:hover {
                    transform: translateY(-2px);
                }
                
                .btn-primary {
                    background: var(--accent-primary);
                    transition: opacity 0.2s ease;
                }
                
                .btn-primary:hover {
                    opacity: 0.8;
                }
                
                .btn-secondary {
                    background: transparent;
                    border: 1px solid var(--bg-border);
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                }
                
                .btn-secondary:hover {
                    background: var(--bg-primary);
                    border-color: var(--text-muted);
                }
                
                .social-link {
                    transition: all 0.2s ease;
                }
                
                .social-link:hover {
                    transform: translateY(-1px);
                }
            `)
            .appendTo('head');

        // Add scroll-based header enhancement
        $(window).on('scroll', function() {
            var scrolled = $(window).scrollTop();
            var $nav = $('.main-navigation');
            
            if (scrolled > 50) {
                $nav.addClass('scrolled');
            } else {
                $nav.removeClass('scrolled');
            }
        });

        // Add scrolled state styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .main-navigation {
                    transition: all 0.2s ease;
                }
                
                .main-navigation.scrolled {
                    background: rgba(255, 255, 255, 0.98);
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                }
            `)
            .appendTo('head');
    }

})(jQuery);
