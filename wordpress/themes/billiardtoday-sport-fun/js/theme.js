/**
 * BilliardToday Sport Fun Theme JavaScript
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

        // Fun parallax effect for hero section
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

        // Fun hover effects
        $('.feature-card').on('mouseenter', function() {
            $(this).find('.feature-icon').addClass('fun-hover');
        }).on('mouseleave', function() {
            $(this).find('.feature-icon').removeClass('fun-hover');
        });

        // Mobile menu toggle with fun animation
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

        // Add fun CSS animations
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
                
                @keyframes funBounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-20px); }
                    60% { transform: translateY(-10px); }
                }
                
                @keyframes funWiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(5deg); }
                    75% { transform: rotate(-5deg); }
                }
                
                @keyframes funPulse {
                    0%, 100% { 
                        transform: scale(1); 
                        box-shadow: 0 4px 6px rgba(255, 107, 53, 0.4);
                    }
                    50% { 
                        transform: scale(1.1); 
                        box-shadow: 0 10px 15px rgba(255, 107, 53, 0.6);
                    }
                }
                
                @keyframes rainbow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
                }
                
                .animate-in {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                
                .fun-hover {
                    animation: funPulse 1s ease-in-out infinite;
                }
                
                .mobile-menu-toggle {
                    display: none;
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.75rem;
                    border-radius: 50px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 6px rgba(255, 107, 53, 0.4);
                    font-family: "Fredoka One", cursive;
                }
                
                .mobile-menu-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 10px 15px rgba(255, 107, 53, 0.6);
                }
                
                .mobile-menu-toggle.active {
                    background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
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
                        background: rgba(255, 255, 255, 0.95);
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
                        border-radius: 15px;
                        margin: 0.25rem 0;
                        transition: all 0.2s ease;
                        font-weight: 600;
                    }
                    
                    .nav-menu a:hover {
                        background: rgba(255, 107, 53, 0.1);
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
            $('.nav-container').append('<button class="mobile-menu-toggle">🎮</button>');
        }

        // Intersection Observer for fun animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        
                        // Add bounce animation to stats
                        if (entry.target.classList.contains('stat-item')) {
                            entry.target.classList.add('fun-bounce');
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

        // Add fun hover effect to buttons
        $('.btn-primary, .btn-secondary, .nav-cta').on('mouseenter', function() {
            $(this).addClass('fun-hover');
        }).on('mouseleave', function() {
            $(this).removeClass('fun-hover');
        });

        // Add fun hover effect CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .fun-hover {
                    transform: translateY(-3px) scale(1.05) !important;
                    box-shadow: 0 10px 15px rgba(255, 107, 53, 0.6) !important;
                }
                
                .btn-primary:hover,
                .btn-secondary:hover,
                .nav-cta:hover {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
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
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    transition: left 0.5s;
                }
                
                .btn-primary:hover::before {
                    left: 100%;
                }
                
                .logo-icon {
                    background: linear-gradient(135deg, #ff006e 0%, #ff6b35 25%, #ffd166 50%, #06ffa5 75%, #00d9ff 100%);
                    background-size: 200% 200%;
                    animation: rainbow 3s ease-in-out infinite;
                }
            `)
            .appendTo('head');

        // Form validation with fun styling
        $('form').on('submit', function(e) {
            var $form = $(this);
            var isValid = true;

            $form.find('input[required], textarea[required], select[required]').each(function() {
                if (!$(this).val()) {
                    isValid = false;
                    $(this).addClass('fun-error');
                } else {
                    $(this).removeClass('fun-error');
                }
            });

            if (!isValid) {
                e.preventDefault();
                showFunNotification('Please fill in all required fields! 🎯', 'error');
            }
        });

        // Add fun error styling
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .fun-error {
                    border-color: #ff006e !important;
                    box-shadow: 0 0 0 3px rgba(255, 0, 110, 0.1) !important;
                    animation: funWiggle 0.5s;
                }
                
                .fun-notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: #ffffff;
                    border: 2px solid #e5e5e5;
                    border-radius: 20px;
                    padding: 1rem 1.5rem;
                    color: #171717;
                    z-index: 10000;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                    animation: fadeInUp 0.3s ease-out;
                    font-weight: 600;
                }
                
                .fun-notification.error {
                    border-color: #ff006e;
                    box-shadow: 0 10px 15px rgba(255, 0, 110, 0.3);
                }
                
                .fun-notification.success {
                    border-color: #06ffa5;
                    box-shadow: 0 10px 15px rgba(6, 255, 165, 0.3);
                }
            `)
            .appendTo('head');

        // Fun notification function
        function showFunNotification(message, type = 'info') {
            var $notification = $('<div class="fun-notification ' + type + '">' + message + '</div>');
            $('body').append($notification);
            
            setTimeout(function() {
                $notification.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 3000);
        }

        // Lazy loading for images with fun fade-in
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
        initSportFunThemeSwitcher();

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

        // Add fun loading states
        $('.btn-primary, .btn-secondary').on('click', function() {
            var $btn = $(this);
            var originalText = $btn.html();
            
            $btn.addClass('fun-loading').prop('disabled', true);
            
            // Simulate loading (remove this in production)
            setTimeout(function() {
                $btn.removeClass('fun-loading').prop('disabled', false).html(originalText);
                showFunNotification('Awesome! Action completed! 🎉', 'success');
                
                // Add confetti effect
                createConfetti();
            }, 1500);
        });

        // Add fun loading state CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .fun-loading {
                    position: relative;
                    color: transparent !important;
                    pointer-events: none;
                }
                
                .fun-loading::after {
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
                    animation: funSpin 1s linear infinite;
                }
                
                @keyframes funSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');

        // Add sport fun theme specific enhancements
        addSportFunThemeEnhancements();
    });

    // Initialize theme switcher
    function initSportFunThemeSwitcher() {
        // Check if theme switcher should be visible
        if ($('body').hasClass('admin-bar') && $('#wp-admin-bar-theme-switcher').length) {
            // Theme switcher is already handled by PHP
            return;
        }

        // Add floating theme switcher for demo purposes
        if (window.location.search.includes('demo=true')) {
            addSportFunFloatingSwitcher();
        }
    }

    // Add sport fun floating theme switcher
    function addSportFunFloatingSwitcher() {
        var switcherHtml = `
            <div class="sport-fun-floating-switcher">
                <button class="sport-fun-switcher-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2v20M2 12h20"/>
                    </svg>
                </button>
                <div class="sport-fun-switcher-menu">
                    <h4>🎮 Switch Theme</h4>
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

        // Add sport fun switcher styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .sport-fun-floating-switcher {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .sport-fun-switcher-toggle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(255, 107, 53, 0.4);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .sport-fun-switcher-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 10px 15px rgba(255, 107, 53, 0.6);
                }
                
                .sport-fun-switcher-menu {
                    position: absolute;
                    top: 60px;
                    right: 0;
                    background: #ffffff;
                    border: 2px solid #e5e5e5;
                    border-radius: 20px;
                    padding: 1.5rem;
                    min-width: 200px;
                    display: none;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                }
                
                .sport-fun-switcher-menu.show {
                    display: block;
                    animation: fadeInUp 0.3s ease-out;
                }
                
                .sport-fun-switcher-menu h4 {
                    color: #171717;
                    margin: 0 0 1rem 0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    font-weight: 700;
                    font-family: "Fredoka One", cursive;
                }
                
                .sport-fun-switcher-menu a {
                    display: block;
                    padding: 0.75rem;
                    color: #404040;
                    text-decoration: none;
                    border-radius: 15px;
                    margin-bottom: 0.5rem;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                    font-weight: 600;
                }
                
                .sport-fun-switcher-menu a:hover {
                    background: #ff6b35;
                    color: white;
                    transform: translateX(5px);
                }
                
                .sport-fun-switcher-menu a.active {
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
                    color: white;
                }
            `)
            .appendTo('head');

        // Switcher functionality
        $('.sport-fun-switcher-toggle').on('click', function() {
            $('.sport-fun-switcher-menu').toggleClass('show');
        });

        // Close switcher when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.sport-fun-floating-switcher').length) {
                $('.sport-fun-switcher-menu').removeClass('show');
            }
        });

        // Handle theme switching
        $('.sport-fun-switcher-menu a').on('click', function(e) {
            e.preventDefault();
            var theme = $(this).data('theme');
            
            // In a real implementation, this would switch the theme
            // For demo, just show a message
            showFunNotification('Switching to: ' + theme + ' 🎮', 'info');
        });
    }

    // Add sport fun theme specific enhancements
    function addSportFunThemeEnhancements() {
        // Add fun animations for sport fun theme
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
                    transform: translateY(-5px) scale(1.02);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
                    transition: all 0.2s ease;
                }
                
                .btn-primary:hover {
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 10px 15px rgba(255, 107, 53, 0.6);
                }
                
                .btn-secondary {
                    background: transparent;
                    border: 3px solid #ff6b35;
                    transition: all 0.2s ease;
                }
                
                .btn-secondary:hover {
                    background: #ff6b35;
                    color: white;
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 4px 6px rgba(255, 107, 53, 0.4);
                }
                
                .social-link {
                    transition: all 0.2s ease;
                }
                
                .social-link:hover {
                    transform: translateY(-2px) scale(1.1);
                }
                
                .main-navigation.scrolled {
                    background: rgba(255, 255, 255, 0.95);
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
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 4px 6px rgba(255, 107, 53, 0.4);
                }
                
                .fun-bounce {
                    animation: funBounce 1s ease-in-out;
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

        // Add fun counter animation for stats
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

    // Create confetti effect
    function createConfetti() {
        var colors = ['#ff6b35', '#ff8c42', '#ffd166', '#06ffa5', '#00d9ff', '#8b5cf6', '#ff006e'];
        var confettiCount = 50;
        
        for (var i = 0; i < confettiCount; i++) {
            var $confetti = $('<div class="confetti"></div>');
            $confetti.css({
                position: 'fixed',
                top: '-10px',
                left: Math.random() * window.innerWidth + 'px',
                width: '10px',
                height: '10px',
                background: colors[Math.floor(Math.random() * colors.length)],
                borderRadius: '50%',
                zIndex: 9999,
                animation: 'confetti 1s ease-out forwards',
                animationDelay: Math.random() * 0.5 + 's'
            });
            
            $('body').append($confetti);
            
            setTimeout(function() {
                $confetti.remove();
            }, 1500);
        }
    }

})(jQuery);
