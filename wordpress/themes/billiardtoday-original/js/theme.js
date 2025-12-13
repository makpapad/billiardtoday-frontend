/**
 * BilliardToday Original Theme JavaScript
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
                }, 1000, 'easeInOutCubic');
            }
        });

        // Parallax effect for hero section
        $(window).on('scroll', function() {
            var scrolled = $(window).scrollTop();
            $('.hero').css('transform', 'translateY(' + (scrolled * 0.5) + 'px)');
            
            // Animate stats on scroll
            $('.stats').each(function() {
                var elementTop = $(this).offset().top;
                var elementBottom = elementTop + $(this).outerHeight();
                var viewportTop = $(window).scrollTop();
                var viewportBottom = viewportTop + $(window).height();

                if (elementBottom > viewportTop && elementTop < viewportBottom) {
                    animateStats();
                }
            });
        });

        // Animate feature cards on hover
        $('.feature-card').on('mouseenter', function() {
            $(this).find('.feature-icon').addClass('animate-pulse');
        }).on('mouseleave', function() {
            $(this).find('.feature-icon').removeClass('animate-pulse');
        });

        // Mobile menu toggle
        $('.mobile-menu-toggle').on('click', function() {
            $('.nav-menu').toggleClass('active');
            $(this).toggleClass('active');
        });

        // Add CSS animations
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .animate-pulse {
                    animation: pulse 2s infinite;
                }
                
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
                
                .fade-in-up {
                    animation: fadeInUp 0.6s ease-out;
                }
                
                .mobile-menu-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    cursor: pointer;
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

        // Intersection Observer for animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in-up');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements
            $('.feature-card, .stat-card, .post-card').each(function() {
                observer.observe(this);
            });
        }

        // Counter animation for stats
        function animateStats() {
            $('.stat-number').each(function() {
                var $this = $(this);
                var countTo = $this.text().replace(/[^0-9]/g, '');
                var suffix = $this.text().replace(/[0-9]/g, '');
                
                if (!$this.hasClass('animated')) {
                    $this.addClass('animated');
                    $({ countNum: 0 }).animate({
                        countNum: countTo
                    }, {
                        duration: 2000,
                        easing: 'swing',
                        step: function() {
                            $this.text(Math.floor(this.countNum) + suffix);
                        },
                        complete: function() {
                            $this.text(countTo + suffix);
                        }
                    });
                }
            });
        }

        // Add hover effect to buttons
        $('.btn-primary, .btn-secondary, .nav-cta').on('mouseenter', function() {
            $(this).addClass('hover-effect');
        }).on('mouseleave', function() {
            $(this).removeClass('hover-effect');
        });

        // Add hover effect CSS
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .hover-effect {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3) !important;
                }
                
                .btn-primary:hover,
                .btn-secondary:hover,
                .nav-cta:hover {
                    transition: all 0.3s ease;
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

        // Add error styling
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                .error {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
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
        initThemeSwitcher();

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

        // Add loading states
        $('.btn-primary, .btn-secondary').on('click', function() {
            var $btn = $(this);
            var originalText = $btn.html();
            
            $btn.addClass('loading').prop('disabled', true);
            
            // Simulate loading (remove this in production)
            setTimeout(function() {
                $btn.removeClass('loading').prop('disabled', false).html(originalText);
            }, 2000);
        });

        // Loading state CSS
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
                    width: 20px;
                    height: 20px;
                    margin: -10px 0 0 -10px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
            .appendTo('head');
    });

    // Initialize theme switcher
    function initThemeSwitcher() {
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

        // Add switcher styles
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
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                    transition: transform 0.3s ease;
                }
                
                .switcher-toggle:hover {
                    transform: scale(1.1);
                }
                
                .switcher-menu {
                    position: absolute;
                    top: 60px;
                    right: 0;
                    background: var(--bg-card);
                    border: 1px solid var(--bg-border);
                    border-radius: 12px;
                    padding: 1rem;
                    min-width: 200px;
                    display: none;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                
                .switcher-menu.show {
                    display: block;
                }
                
                .switcher-menu h4 {
                    color: var(--text-primary);
                    margin: 0 0 1rem 0;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .switcher-menu a {
                    display: block;
                    padding: 0.75rem;
                    color: var(--text-muted);
                    text-decoration: none;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    transition: all 0.3s ease;
                }
                
                .switcher-menu a:hover {
                    background: rgba(139, 92, 246, 0.2);
                    color: var(--text-primary);
                    transform: translateX(5px);
                }
                
                .switcher-menu a.active {
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
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

})(jQuery);
