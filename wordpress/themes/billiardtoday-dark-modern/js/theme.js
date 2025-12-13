/**
 * BilliardToday Dark Modern Theme JavaScript
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

        // Advanced parallax effect for hero section
        $(window).on('scroll', function() {
            var scrolled = $(window).scrollTop();
            var parallaxSpeed = 0.5;
            
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

        // Modern hover effects with glow
        $('.feature-card').on('mouseenter', function() {
            $(this).find('.feature-icon').addClass('glow-effect');
        }).on('mouseleave', function() {
            $(this).find('.feature-icon').removeClass('glow-effect');
        });

        // Mobile menu toggle with modern animation
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

        // Add modern CSS animations
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
                
                @keyframes glowPulse {
                    0%, 100% { 
                        transform: scale(1); 
                        box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
                    }
                    50% { 
                        transform: scale(1.05); 
                        box-shadow: 0 0 30px rgba(255, 0, 110, 0.7);
                    }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
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
                
                .animate-in {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                
                .glow-effect {
                    animation: glowPulse 2s ease-in-out infinite;
                }
                
                .float-animation {
                    animation: float 3s ease-in-out infinite;
                }
                
                .slide-in {
                    animation: slideIn 0.6s ease-out;
                }
                
                .mobile-menu-toggle {
                    display: none;
                    background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0.75rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
                }
                
                .mobile-menu-toggle:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 30px rgba(255, 0, 110, 0.5);
                }
                
                .mobile-menu-toggle.active {
                    background: linear-gradient(135deg, #ff006e 0%, #00d4ff 100%);
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
                        background: rgba(26, 26, 26, 0.98);
                        backdrop-filter: blur(20px);
                        flex-direction: column;
                        padding: 2rem;
                        transform: translateY(-100%);
                        transition: transform 0.3s ease;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                        z-index: 999;
                    }
                    
                    .nav-menu.active {
                        transform: translateY(0);
                    }
                    
                    .nav-menu a {
                        padding: 1rem;
                        border-radius: 8px;
                        margin: 0.25rem 0;
                        transition: all 0.3s ease;
                    }
                    
                    .nav-menu a:hover {
                        background: rgba(0, 212, 255, 0.1);
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

        // Intersection Observer for modern animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        
                        // Add floating animation to hero elements
                        if (entry.target.classList.contains('hero-title')) {
                            entry.target.classList.add('float-animation');
                        }
                        
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements
            $('.feature-card, .post-card, .section-title, .hero-title').each(function() {
                observer.observe(this);
            });
        }

        // Add modern hover effect to buttons
        $('.btn-primary, .btn-secondary, .nav-cta').on('mouseenter', function() {
            $(this).addClass('modern-hover');
        }).on('mouseleave', function() {
            $(this).removeClass('modern-hover');
        });

        // Add modern hover effect CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .modern-hover {
                    transform: translateY(-3px) scale(1.02) !important;
                    box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4) !important;
                }
                
                .btn-primary:hover,
                .btn-secondary:hover,
                .nav-cta:hover {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
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

        // Form validation with modern styling
        $('form').on('submit', function(e) {
            var $form = $(this);
            var isValid = true;

            $form.find('input[required], textarea[required], select[required]').each(function() {
                if (!$(this).val()) {
                    isValid = false;
                    $(this).addClass('modern-error');
                } else {
                    $(this).removeClass('modern-error');
                }
            });

            if (!isValid) {
                e.preventDefault();
                showModernNotification('Please fill in all required fields.', 'error');
            }
        });

        // Add modern error styling
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .modern-error {
                    border-color: #ff006e !important;
                    box-shadow: 0 0 0 3px rgba(255, 0, 110, 0.2) !important;
                    animation: shake 0.5s;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                .modern-notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border: 1px solid #2a2a2a;
                    border-radius: 12px;
                    padding: 1rem 1.5rem;
                    color: white;
                    z-index: 10000;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(20px);
                    animation: slideIn 0.3s ease-out;
                }
                
                .modern-notification.error {
                    border-color: #ff006e;
                    box-shadow: 0 8px 32px rgba(255, 0, 110, 0.3);
                }
                
                .modern-notification.success {
                    border-color: #00d4ff;
                    box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
                }
            `)
            .appendTo('head');

        // Modern notification function
        function showModernNotification(message, type = 'info') {
            var $notification = $('<div class="modern-notification ' + type + '">' + message + '</div>');
            $('body').append($notification);
            
            setTimeout(function() {
                $notification.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 3000);
        }

        // Lazy loading for images with modern fade-in
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
        initModernThemeSwitcher();

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
                var speed = 0.1 + (index * 0.05);
                $(this).css('transform', 'translateY(' + (scrolled * speed) + 'px)');
            });
        }

        // Add modern loading states
        $('.btn-primary, .btn-secondary').on('click', function() {
            var $btn = $(this);
            var originalText = $btn.html();
            
            $btn.addClass('modern-loading').prop('disabled', true);
            
            // Simulate loading (remove this in production)
            setTimeout(function() {
                $btn.removeClass('modern-loading').prop('disabled', false).html(originalText);
                showModernNotification('Action completed successfully!', 'success');
            }, 1500);
        });

        // Add modern loading state CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .modern-loading {
                    position: relative;
                    color: transparent !important;
                    pointer-events: none;
                }
                
                .modern-loading::after {
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
                    animation: modernSpin 1s linear infinite;
                }
                
                @keyframes modernSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');

        // Add modern theme specific enhancements
        addModernThemeEnhancements();
    });

    // Initialize theme switcher
    function initModernThemeSwitcher() {
        // Check if theme switcher should be visible
        if ($('body').hasClass('admin-bar') && $('#wp-admin-bar-theme-switcher').length) {
            // Theme switcher is already handled by PHP
            return;
        }

        // Add floating theme switcher for demo purposes
        if (window.location.search.includes('demo=true')) {
            addModernFloatingSwitcher();
        }
    }

    // Add modern floating theme switcher
    function addModernFloatingSwitcher() {
        var switcherHtml = `
            <div class="modern-floating-switcher">
                <button class="modern-switcher-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2v20M2 12h20"/>
                    </svg>
                </button>
                <div class="modern-switcher-menu">
                    <h4>🎨 Switch Theme</h4>
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

        // Add modern switcher styles
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .modern-floating-switcher {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .modern-switcher-toggle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
                    border: none;
                    color: white;
                    font-size: 1.25rem;
                    cursor: pointer;
                    box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .modern-switcher-toggle:hover {
                    transform: scale(1.1) rotate(15deg);
                    box-shadow: 0 12px 48px rgba(255, 0, 110, 0.5);
                }
                
                .modern-switcher-menu {
                    position: absolute;
                    top: 60px;
                    right: 0;
                    background: rgba(26, 26, 26, 0.98);
                    backdrop-filter: blur(20px);
                    border: 1px solid #2a2a2a;
                    border-radius: 16px;
                    padding: 1.5rem;
                    min-width: 200px;
                    display: none;
                    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
                }
                
                .modern-switcher-menu.show {
                    display: block;
                    animation: modernSlideIn 0.3s ease-out;
                }
                
                @keyframes modernSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .modern-switcher-menu h4 {
                    color: #ffffff;
                    margin: 0 0 1rem 0;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                }
                
                .modern-switcher-menu a {
                    display: block;
                    padding: 0.75rem;
                    color: #a0a0a0;
                    text-decoration: none;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    transition: all 0.3s ease;
                    font-size: 0.875rem;
                }
                
                .modern-switcher-menu a:hover {
                    background: rgba(0, 212, 255, 0.1);
                    color: #00d4ff;
                    transform: translateX(5px);
                }
                
                .modern-switcher-menu a.active {
                    background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
                    color: white;
                }
            `)
            .appendTo('head');

        // Switcher functionality
        $('.modern-switcher-toggle').on('click', function() {
            $('.modern-switcher-menu').toggleClass('show');
        });

        // Close switcher when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.modern-floating-switcher').length) {
                $('.modern-switcher-menu').removeClass('show');
            }
        });

        // Handle theme switching
        $('.modern-switcher-menu a').on('click', function(e) {
            e.preventDefault();
            var theme = $(this).data('theme');
            
            // In a real implementation, this would switch the theme
            // For demo, just show a message
            showModernNotification('Switching to: ' + theme, 'info');
        });
    }

    // Add modern theme specific enhancements
    function addModernThemeEnhancements() {
        // Add sophisticated animations for modern theme
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .hero {
                    transition: transform 0.3s ease;
                }
                
                .feature-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .feature-card:hover {
                    transform: translateY(-5px) scale(1.02);
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
                    transition: all 0.3s ease;
                }
                
                .btn-primary:hover {
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 12px 48px rgba(0, 212, 255, 0.4);
                }
                
                .btn-secondary {
                    background: transparent;
                    border: 2px solid #00d4ff;
                    transition: all 0.3s ease;
                }
                
                .btn-secondary:hover {
                    background: #00d4ff;
                    color: #0a0a0a;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4);
                }
                
                .social-link {
                    transition: all 0.3s ease;
                }
                
                .social-link:hover {
                    transform: translateY(-3px) rotate(5deg);
                }
                
                .main-navigation.scrolled {
                    background: rgba(10, 10, 10, 0.98);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                }
                
                .logo-icon {
                    transition: all 0.3s ease;
                }
                
                .logo:hover .logo-icon {
                    transform: rotate(180deg) scale(1.1);
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

        // Add particle effect for hero section
        addParticleEffect();
    }

    // Add particle effect
    function addParticleEffect() {
        var particleCount = 50;
        var $hero = $('.hero');
        
        for (var i = 0; i < particleCount; i++) {
            var $particle = $('<div class="particle"></div>');
            $particle.css({
                position: 'absolute',
                width: Math.random() * 4 + 1 + 'px',
                height: Math.random() * 4 + 1 + 'px',
                background: 'rgba(0, 212, 255, ' + (Math.random() * 0.5 + 0.1) + ')',
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: 'float ' + (Math.random() * 20 + 10) + 's linear infinite'
            });
            $hero.append($particle);
        }
        
        // Add particle animation
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .particle {
                    pointer-events: none;
                }
                
                @keyframes float {
                    0% {
                        transform: translateY(100vh) translateX(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-100vh) translateX(100px);
                        opacity: 0;
                    }
                }
            `)
            .appendTo('head');
    }

})(jQuery);
