/**
 * BilliardToday Theme Switcher JavaScript
 */

(function($) {
    'use strict';

    // Theme Switcher Class
    class ThemeSwitcher {
        constructor() {
            this.currentTheme = billiardtoday_switcher.current_theme;
            this.themes = billiardtoday_switcher.themes;
            this.canSwitch = billiardtoday_switcher.can_switch;
            this.isLoading = false;
            
            this.init();
        }
        
        init() {
            this.bindEvents();
            this.setupKeyboardShortcuts();
            this.setupURLParams();
            this.setupAutoHide();
        }
        
        bindEvents() {
            const self = this;
            
            // Toggle switcher panel
            $('.switcher-toggle').on('click', function(e) {
                e.preventDefault();
                self.togglePanel();
            });
            
            // Close panel
            $('.close-switcher').on('click', function(e) {
                e.preventDefault();
                self.hidePanel();
            });
            
            // Theme selection
            $('.theme-option').on('click', function(e) {
                e.preventDefault();
                const theme = $(this).data('theme');
                self.selectTheme(theme);
            });
            
            // Activate buttons
            $('.activate-btn').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const theme = $(this).closest('.theme-option').data('theme');
                self.switchTheme(theme);
            });
            
            // Close on outside click
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.billiardtoday-theme-switcher').length) {
                    self.hidePanel();
                }
            });
            
            // Escape key to close
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hidePanel();
                }
            });
            
            // Admin bar theme options
            $('.theme-switcher-option').on('click', function(e) {
                e.preventDefault();
                const theme = $(this).data('theme');
                self.switchTheme(theme);
            });
        }
        
        setupKeyboardShortcuts() {
            $(document).on('keydown', function(e) {
                // Ctrl/Cmd + Shift + T to toggle switcher
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    this.togglePanel();
                }
                
                // Number keys 1-8 to quickly switch themes
                if (this.canSwitch && !this.isLoading && $('.switcher-panel').hasClass('show')) {
                    const themeKeys = Object.keys(this.themes);
                    const keyNum = parseInt(e.key);
                    
                    if (keyNum >= 1 && keyNum <= 8 && themeKeys[keyNum - 1]) {
                        e.preventDefault();
                        this.switchTheme(themeKeys[keyNum - 1]);
                    }
                }
            }.bind(this));
        }
        
        setupURLParams() {
            // Check for theme parameter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const themeParam = urlParams.get('theme');
            
            if (themeParam && this.themes[themeParam]) {
                this.switchTheme(themeParam, false); // Don't show notification for URL param
            }
            
            // Add theme to URL when switching
            this.originalURL = window.location.href;
        }
        
        setupAutoHide() {
            // Auto-hide panel after 10 seconds of inactivity
            let hideTimer;
            
            $('.switcher-panel').on('mouseenter', function() {
                clearTimeout(hideTimer);
            }).on('mouseleave', function() {
                hideTimer = setTimeout(() => {
                    this.hidePanel();
                }, 10000);
            }.bind(this));
        }
        
        togglePanel() {
            const panel = $('.switcher-panel');
            if (panel.hasClass('show')) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        }
        
        showPanel() {
            const panel = $('.switcher-panel');
            panel.addClass('show').addClass('fade-in');
            
            // Focus management
            setTimeout(() => {
                $('.close-switcher').focus();
            }, 100);
            
            // Announce to screen readers
            this.announceToScreenReader('Theme switcher opened');
        }
        
        hidePanel() {
            const panel = $('.switcher-panel');
            panel.removeClass('show');
            
            // Announce to screen readers
            this.announceToScreenReader('Theme switcher closed');
        }
        
        selectTheme(theme) {
            if (!this.themes[theme]) return;
            
            // Update visual selection
            $('.theme-option').removeClass('selected');
            $(`.theme-option[data-theme="${theme}"]`).addClass('selected');
            
            // If not current theme and user can switch, show activate button
            if (theme !== this.currentTheme && this.canSwitch) {
                this.showActivateButton(theme);
            }
        }
        
        showActivateButton(theme) {
            $('.theme-option').each(function() {
                const $this = $(this);
                const $status = $this.find('.theme-status');
                
                if ($this.data('theme') === theme) {
                    $status.html('<button class="activate-btn">Activate</button>');
                } else {
                    const isActive = $this.data('theme') === this.currentTheme;
                    $status.html(isActive ? 
                        '<span class="active-badge">Active</span>' : 
                        '<button class="activate-btn">Activate</button>'
                    );
                }
            }.bind(this));
        }
        
        async switchTheme(theme, showNotification = true) {
            if (!this.canSwitch) {
                this.showError('You do not have permission to switch themes');
                return;
            }
            
            if (this.isLoading) {
                return;
            }
            
            if (!this.themes[theme]) {
                this.showError('Invalid theme selected');
                return;
            }
            
            if (theme === this.currentTheme) {
                this.showInfo('This theme is already active');
                return;
            }
            
            this.isLoading = true;
            this.setLoadingState(true);
            
            try {
                const response = await $.ajax({
                    url: billiardtoday_switcher.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'switch_theme',
                        theme: theme,
                        nonce: billiardtoday_switcher.nonce
                    },
                    timeout: 10000
                });
                
                if (response.success) {
                    this.handleThemeSwitchSuccess(theme, showNotification);
                } else {
                    throw new Error(response.data || 'Theme switch failed');
                }
            } catch (error) {
                this.handleThemeSwitchError(error);
            } finally {
                this.isLoading = false;
                this.setLoadingState(false);
            }
        }
        
        handleThemeSwitchSuccess(theme, showNotification) {
            const themeInfo = this.themes[theme];
            
            // Update current theme
            this.currentTheme = theme;
            
            // Update UI
            this.updateThemeUI(theme);
            
            // Update URL
            this.updateURL(theme);
            
            // Show success notification
            if (showNotification) {
                this.showSuccess(`Switched to ${themeInfo.name}`);
            }
            
            // Trigger custom event
            $(document).trigger('theme:switched', [theme, themeInfo]);
            
            // Reload after a short delay to apply new theme
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        
        handleThemeSwitchError(error) {
            console.error('Theme switch error:', error);
            this.showError('Failed to switch theme. Please try again.');
        }
        
        updateThemeUI(theme) {
            // Update active states
            $('.theme-option').removeClass('active');
            $(`.theme-option[data-theme="${theme}"]`).addClass('active');
            
            // Update status displays
            $('.theme-status').each(function() {
                const $this = $(this);
                const optionTheme = $this.closest('.theme-option').data('theme');
                
                if (optionTheme === theme) {
                    $this.html('<span class="active-badge">Active</span>');
                } else {
                    $this.html('<button class="activate-btn">Activate</button>');
                }
            });
            
            // Update current theme display
            $('#current-theme-name').text(this.themes[theme].name);
            
            // Update admin bar if present
            $('#wp-adminbar .billiardtheme-switcher-toggle').text(
                this.themes[theme].name + ' 🎨'
            );
        }
        
        updateURL(theme) {
            const url = new URL(window.location);
            url.searchParams.set('theme', theme);
            window.history.replaceState({}, '', url);
        }
        
        setLoadingState(loading) {
            const panel = $('.switcher-panel');
            
            if (loading) {
                panel.addClass('loading');
                $('.activate-btn').addClass('loading').text('Loading...');
                
                // Add loading overlay
                if (!$('.loading-overlay').length) {
                    panel.append('<div class="loading-overlay"><div class="loading-spinner"></div></div>');
                }
            } else {
                panel.removeClass('loading');
                $('.activate-btn').removeClass('loading').text('Activate');
                $('.loading-overlay').remove();
            }
        }
        
        showSuccess(message) {
            this.showNotification(message, 'success');
        }
        
        showError(message) {
            this.showNotification(message, 'error');
        }
        
        showInfo(message) {
            this.showNotification(message, 'info');
        }
        
        showNotification(message, type = 'info') {
            const className = type === 'success' ? 'success-message' : 
                             type === 'error' ? 'error-message' : 'info-message';
            
            const notification = $(`<div class="${className}">${message}</div>`);
            
            $('.switcher-panel').append(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 3000);
        }
        
        announceToScreenReader(message) {
            const announcement = $('<div class="sr-only" role="status" aria-live="polite"></div>')
                .text(message);
            
            $('body').append(announcement);
            
            setTimeout(() => {
                announcement.remove();
            }, 1000);
        }
        
        // Public methods
        getCurrentTheme() {
            return this.currentTheme;
        }
        
        getThemeInfo(theme) {
            return this.themes[theme] || null;
        }
        
        getAllThemes() {
            return this.themes;
        }
    }
    
    // Initialize when DOM is ready
    $(document).ready(function() {
        // Only initialize if switcher data is available
        if (typeof billiardtoday_switcher !== 'undefined') {
            window.billiardtodayThemeSwitcher = new ThemeSwitcher();
            
            // Add global functions for external access
            window.switchTheme = function(theme) {
                return window.billiardtodayThemeSwitcher.switchTheme(theme);
            };
            
            window.getCurrentTheme = function() {
                return window.billiardtodayThemeSwitcher.getCurrentTheme();
            };
            
            // Add debug info in development
            if (window.location.search.includes('debug=true')) {
                console.log('BilliardToday Theme Switcher initialized');
                console.log('Current theme:', billiardtoday_switcher.current_theme);
                console.log('Available themes:', billiardtoday_switcher.themes);
                console.log('Can switch themes:', billiardtoday_switcher.can_switch);
            }
        }
    });
    
    // Add CSS for additional notification types
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .error-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ef4444;
                color: white;
                padding: 1rem 2rem;
                border-radius: 12px;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
                z-index: 20;
                animation: errorPop 0.5s ease-out;
            }
            
            .info-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #3b82f6;
                color: white;
                padding: 1rem 2rem;
                border-radius: 12px;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
                z-index: 20;
                animation: infoPop 0.5s ease-out;
            }
            
            @keyframes errorPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            @keyframes infoPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
            
            .theme-option.selected {
                border-color: #3b82f6 !important;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
            }
            
            .theme-option.selected:hover {
                border-color: #2563eb !important;
            }
        `)
        .appendTo('head');
    
})(jQuery);
