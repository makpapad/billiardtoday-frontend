/**
 * BilliardToday Corporate Theme JavaScript
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

        // Professional parallax effect for hero section
        $(window).on('scroll', function() {
            var scrolled = $(window).scrollTop();
            var parallaxSpeed = 0.3;
            
            $('.hero').css('transform', 'translateY(' + (scrolled * parallaxSpeed) + 'px)');
            
            // Animate feature cards on scroll with stagger
            $('.feature-card').each(function(index) {
                var elementTop = $(this).offset().top;
                var elementBottom = elementTop + $(this).outerHeight();
                var viewportTop = $(window).scrollTop();
                var viewportBottom = viewportTop + $(window).height();

                if (elementBottom > viewportTop && elementTop < viewportBottom) {
                    var delay = index * 100;
                    $(this).addClass('animate-in');
                    $(this).css('animation-delay', delay + 'ms');
                }
            });
        });

        // Professional hover effects
        $('.feature-card').on('mouseenter', function() {
            $(this).find('.feature-icon').addClass('corporate-hover');
        }).on('mouseleave', function() {
            $(this).find('.feature-icon').removeClass('corporate-hover');
        });

        // Mobile menu toggle with professional animation
        $('.mobile-menu-toggle').on('click', function() {
            $('.nav-menu').toggleClass('active');
            $(this).toggleClass('active');
            
            // Add body lock when menu is open
            if ($('.nav-menu').hasClass('active')) {
                $('body').addClass('menu-open');
            } else {
                $('body').removeClass('menu-open');
            }
        });

        // Add professional CSS animations
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes corporatePulse {
                    0%, 100% { 
                        transform: scale(1); 
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    50% { 
                        transform: scale(1.05); 
                        box-shadow: 0 10px 15px rgba(59, 130, 246, 0.3);
                    }
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes countUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-in {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                
                .corporate-hover {
                    animation: corporatePulse 2s ease-in-out infinite;
                }
                
                .slide-in {
                    animation: slideIn 0.6s ease-out;
                }
                
                .count-animation {
                    animation: countUp 0.6s ease-out;
                }
                
                .mobile-menu-toggle {
                    display: none;
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.75rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                
                .mobile-menu-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 10px 15px rgba(59, 130, 246, 0.3);
                }
                
                .mobile-menu-toggle.active {
                    background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
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
                        background: rgba(255, 255, 255, 0.98);
                        backdrop-filter: blur(20px);
                        flex-direction: column;
                        padding: 2rem;
                        transform: translateY(-100%);
                        transition: transform 0.3s ease;
                        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                        z-index: 999;
                    }
                    
                    .nav-menu.active {
                        transform: translateY(0);
                    }
                    
                    .nav-menu a {
                        padding: 1rem;
                        border-radius: 6px;
                        margin: 0.25rem 0;
                        transition: all 0.2s ease;
                    }
                    
                    .nav-menu a:hover {
                        background: rgba(59, 130, 246, 0.1);
                        transform: translateX(5px);
                    }
                    
                    body.menu-open {
                        overflow: hidden;
                    }
                }
            `)
            .appendTo('head');

        // Add mobile menu toggle to navigation
        if ($(window).width() <= 768) {
            $('.nav-container').append('<button class="mobile-menu-toggle">☰</button>');
        }

        // Intersection Observer for professional animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        
                        // Add count animation to stats
                        if (entry.target.classList.contains('stat-item')) {
                            entry.target.classList.add('count-animation');
                        }
                        
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements
            $('.feature-card, .post-card, .section-title, .stat-item').each(function() {
                observer.observe(this);
            });
        }

        // Add professional hover effect to buttons
        $('.btn-primary, .btn-secondary, .nav-cta').on('mouseenter', function() {
            $(this).addClass('corporate-hover');
        }).on('mouseleave', function() {
            $(this).removeClass('corporate-hover');
        });

        // Add professional hover effect CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .corporate-hover {
                    transform: translateY(-2px) scale(1.02) !important;
                    box-shadow: 0 10px 15px rgba(59, 130, 246, 0.3) !important;
                }
                
                .btn-primary:hover,
                .btn-secondary:hover,
                .nav-cta:hover {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    position: relative;
                    overflow: hidden;
                }
                
                .btn-primary::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transition: left 0.5s;
                }
                
                .btn-primary:hover::before {
                    left: 100%;
                }
            `)
            .appendTo('head');

        // Form validation with professional styling
        $('form').on('submit', function(e) {
            var $form = $(this);
            var isValid = true;

            $form.find('input[required], textarea[required], select[required]').each(function() {
                if (!$(this).val()) {
                    isValid = false;
                    $(this).addClass('corporate-error');
                } else {
                    $(this).removeClass('corporate-error');
                }
            });

            if (!isValid) {
                e.preventDefault();
                showCorporateNotification('Please fill in all required fields.', 'error');
            }
        });

        // Add professional error styling
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .corporate-error {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                    animation: shake 0.5s;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                .corporate-notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 1rem 1.5rem;
                    color: #1e293b;
                    z-index: 10000;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                    animation: slideIn 0.3s ease-out;
                }
                
                .corporate-notification.error {
                    border-color: #ef4444;
                    box-shadow: 0 10px 15px rgba(239, 68, 68, 0.3);
                }
                
                .corporate-notification.success {
                    border-color: #10b981;
                    box-shadow: 0 10px 15px rgba(16, 185, 129, 0.3);
                }
            `)
            .appendTo('head');

        // Professional notification function
        function showCorporateNotification(message, type = 'info') {
            var $notification = $('<div class="corporate-notification ' + type + '">' + message + '</div>');
            $('body').append($notification);
            
            setTimeout(function() {
                $notification.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 3000);
        }

        // Lazy loading for images with professional fade-in
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('fade-in-image');
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

        // Add fade-in image animation
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .fade-in-image {
                    animation: fadeIn 0.6s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `)
            .appendTo('head');

        // Theme switcher functionality
        initCorporateThemeSwitcher();

        // Performance optimization: Debounce scroll events
        var scrollTimer;
        $(window).on('scroll', function() {
            if (scrollTimer) {
                clearTimeout(scrollTimer);
            }
            scrollTimer = setTimeout(function() {
                // Scroll-based animations here
                updateScrollEffects();
            }, 50);
        });

        // Update scroll effects
        function updateScrollEffects() {
            var scrolled = $(window).scrollTop();
            
            // Update navigation background
            if (scrolled > 50) {
                $('.main-navigation').addClass('scrolled');
            } else {
                $('.main-navigation').removeClass('scrolled');
            }
            
            // Parallax effects for different elements
            $('.feature-card').each(function(index) {
                var speed = 0.05 + (index * 0.02);
                $(this).css('transform', 'translateY(' + (scrolled * speed) + 'px)');
            });
        }

        // Add professional loading states
        $('.btn-primary, .btn-secondary').on('click', function() {
            var $btn = $(this);
            var originalText = $btn.html();
            
            $btn.addClass('corporate-loading').prop('disabled', true);
            
            // Simulate loading (remove this in production)
            setTimeout(function() {
                $btn.removeClass('corporate-loading').prop('disabled', false).html(originalText);
                showCorporateNotification('Action completed successfully!', 'success');
            }, 1500);
        });

        // Add professional loading state CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .corporate-loading {
                    position: relative;
                    color: transparent !important;
                    pointer-events: none;
                }
                
                .corporate-loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    margin: -10px 0 0 -10px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: corporateSpin 1s linear infinite;
                }
                
                @keyframes corporateSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');

        // Add corporate theme specific enhancements
        addCorporateThemeEnhancements();
    });

    // Initialize theme switcher
    function initCorporateThemeSwitcher() {
        // Check if theme switcher should be visible
        if ($('body').hasClass('admin-bar') && $('#wp-admin-bar-theme-switcher').length) {
            // Theme switcher is already handled by PHP
            return;
        }

        // Add floating theme switcher for demo purposes
        if (window.location.search.includes('demo=true')) {
            addCorporateFloatingSwitcher();
        }
    }

    // Add corporate floating theme switcher
    function addCorporateFloatingSwitcher() {
        var switcherHtml = `
            <div class="corporate-floating-switcher">
                <button class="corporate-switcher-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2v20M2 12h20"/>
                    </svg>
                </button>
                <div class="corporate-switcher-menu">
                    <h4>🏢 Switch Theme</h4>
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

        // Add corporate switcher styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .corporate-floating-switcher {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .corporate-switcher-toggle {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .corporate-switcher-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 10px 15px rgba(59, 130, 246, 0.3);
                }
                
                .corporate-switcher-menu {
                    position: absolute;
                    top: 60px;
                    right: 0;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 1.5rem;
                    min-width: 200px;
                    display: none;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                }
                
                .corporate-switcher-menu.show {
                    display: block;
                    animation: corporateSlideIn 0.3s ease-out;
                }
                
                @keyframes corporateSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .corporate-switcher-menu h4 {
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    font-weight: 600;
                }
                
                .corporate-switcher-menu a {
                    display: block;
                    padding: 0.75rem;
                    color: #475569;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-bottom: 0.5rem;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                }
                
                .corporate-switcher-menu a:hover {
                    background: #3b82f6;
                    color: white;
                    transform: translateX(5px);
                }
                
                .corporate-switcher-menu a.active {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    color: white;
                }
            `)
            .appendTo('head');

        // Switcher functionality
        $('.corporate-switcher-toggle').on('click', function() {
            $('.corporate-switcher-menu').toggleClass('show');
        });

        // Close switcher when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.corporate-floating-switcher').length) {
                $('.corporate-switcher-menu').removeClass('show');
            }
        });

        // Handle theme switching
        $('.corporate-switcher-menu a').on('click', function(e) {
            e.preventDefault();
            var theme = $(this).data('theme');
            
            // In a real implementation, this would switch the theme
            // For demo, just show a message
            showCorporateNotification('Switching to: ' + theme, 'info');
        });
    }

    // Add corporate theme specific enhancements
    function addCorporateThemeEnhancements() {
        // Add professional animations for corporate theme
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .hero {
                    transition: transform 0.3s ease;
                }
                
                .feature-card {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .feature-card:hover {
                    transform: translateY(-2px) scale(1.02);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    transition: all 0.2s ease;
                }
                
                .btn-primary:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 10px 15px rgba(59, 130, 246, 0.3);
                }
                
                .btn-secondary {
                    background: transparent;
                    border: 2px solid #3b82f6;
                    transition: all 0.2s ease;
                }
                
                .btn-secondary:hover {
                    background: #3b82f6;
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
                }
                
                .social-link {
                    transition: all 0.2s ease;
                }
                
                .social-link:hover {
                    transform: translateY(-2px);
                }
                
                .main-navigation.scrolled {
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                
                .logo-icon {
                    transition: all 0.2s ease;
                }
                
                .logo:hover .logo-icon {
                    transform: rotate(180deg) scale(1.1);
                }
                
                .stat-item {
                    transition: all 0.2s ease;
                }
                
                .stat-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
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

        // Add professional counter animation for stats
        animateCounters();
    }

    // Animate counters
    function animateCounters() {
        $('.stat-number').each(function() {
            var $this = $(this);
            var countTo = $this.text();
            var duration = 2000;
            
            // Skip if not a number
            if (!countTo.match(/\d+/)) return;
            
            $this.prop('Counter', 0).animate({
                Counter: countTo
            }, {
                duration: duration,
                easing: 'swing',
                step: function(now) {
                    $this.text(Math.ceil(now));
                }
            });
        });
    }

})(jQuery);
