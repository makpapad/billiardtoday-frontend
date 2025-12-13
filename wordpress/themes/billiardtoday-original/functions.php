<?php
/**
 * BilliardToday Original Theme Functions
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Theme Setup
function billiardtoday_original_setup() {
    // Add default posts and comments RSS feed links to head
    add_theme_support('automatic-feed-links');
    
    // Let WordPress manage the document title
    add_theme_support('title-tag');
    
    // Enable support for Post Thumbnails on posts and pages
    add_theme_support('post-thumbnails');
    
    // Enable support for custom logo
    add_theme_support('custom-logo', array(
        'height'      => 100,
        'width'       => 100,
        'flex-height' => true,
        'flex-width'  => true,
    ));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => esc_html__('Primary Menu', 'billiardtoday'),
        'footer'  => esc_html__('Footer Menu', 'billiardtoday'),
    ));
    
    // Switch default core markup for search form, comment form, and comments to output valid HTML5
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ));
    
    // Add theme support for selective refresh for widgets
    add_theme_support('customize-selective-refresh-widgets');
    
    // Add support for responsive embedded content
    add_theme_support('responsive-embeds');
    
    // Add support for wide and full alignment
    add_theme_support('align-wide');
}
add_action('after_setup_theme', 'billiardtoday_original_setup');

// Enqueue scripts and styles
function billiardtoday_original_scripts() {
    // Theme stylesheet
    wp_enqueue_style('billiardtoday-original-style', get_stylesheet_uri(), array(), '1.0.0');
    
    // Google Fonts
    wp_enqueue_style('billiardtoday-original-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap', array(), null);
    
    // Theme JavaScript
    wp_enqueue_script('billiardtoday-original-script', get_template_directory_uri() . '/js/theme.js', array('jquery'), '1.0.0', true);
    
    // Localize script
    wp_localize_script('billiardtoday-original-script', 'billiardtoday_original', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('billiardtoday_original_nonce'),
    ));
}
add_action('wp_enqueue_scripts', 'billiardtoday_original_scripts');

// Register widget areas
function billiardtoday_original_widgets_init() {
    register_sidebar(array(
        'name'          => esc_html__('Sidebar', 'billiardtoday'),
        'id'            => 'sidebar-1',
        'description'   => esc_html__('Add widgets here.', 'billiardtoday'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
    
    register_sidebar(array(
        'name'          => esc_html__('Footer Widgets', 'billiardtoday'),
        'id'            => 'footer-widgets',
        'description'   => esc_html__('Add footer widgets here.', 'billiardtoday'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
}
add_action('widgets_init', 'billiardtoday_original_widgets_init');

// Custom template tags for this theme
require get_template_directory() . '/inc/template-tags.php';

// Functions which enhance the theme by hooking into WordPress
require get_template_directory() . '/inc/template-functions.php';

// Load Jetpack compatibility file
if (defined('JETPACK__VERSION')) {
    require get_template_directory() . '/inc/jetpack.php';
}

// Theme Switcher Functionality
function billiardtoday_original_switcher() {
    if (isset($_POST['theme']) && isset($_POST['nonce'])) {
        if (wp_verify_nonce($_POST['nonce'], 'billiardtoday_original_nonce')) {
            $theme = sanitize_text_field($_POST['theme']);
            $allowed_themes = array(
                'billiardtoday-original',
                'billiardtoday-original-light',
                'billiardtoday-new',
                'billiardtoday-light',
                'billiardtoday-minimal',
                'billiardtoday-dark-modern',
                'billiardtoday-corporate',
                'billiardtoday-sport-fun'
            );
            
            if (in_array($theme, $allowed_themes)) {
                switch_theme($theme);
                wp_redirect(home_url());
                exit;
            }
        }
    }
}
add_action('admin_post_switch_theme', 'billiardtoday_original_switcher');

// AJAX Theme Switcher
function billiardtoday_original_ajax_switch_theme() {
    check_ajax_referer('billiardtoday_original_nonce', 'nonce');
    
    if (isset($_POST['theme'])) {
        $theme = sanitize_text_field($_POST['theme']);
        $allowed_themes = array(
            'billiardtoday-original',
            'billiardtoday-original-light',
            'billiardtoday-new',
            'billiardtoday-light',
            'billiardtoday-minimal',
            'billiardtoday-dark-modern',
            'billiardtoday-corporate',
            'billiardtoday-sport-fun'
        );
        
        if (in_array($theme, $allowed_themes)) {
            switch_theme($theme);
            wp_send_json_success(array('theme' => $theme));
        }
    }
    
    wp_send_json_error('Invalid theme');
}
add_action('wp_ajax_switch_theme', 'billiardtoday_original_ajax_switch_theme');

// Add theme switcher to admin bar
function billiardtoday_original_admin_bar_switcher($wp_admin_bar) {
    if (!is_admin() && current_user_can('switch_themes')) {
        $args = array(
            'id'    => 'theme-switcher',
            'title' => 'Switch Theme',
            'href'  => '#',
            'meta'  => array(
                'class' => 'theme-switcher-toggle',
            ),
        );
        $wp_admin_bar->add_node($args);
    }
}
add_action('admin_bar_menu', 'billiardtoday_original_admin_bar_switcher', 999);

// Add theme switcher styles to admin
function billiardtoday_original_admin_styles() {
    echo '<style>
        .theme-switcher-toggle { 
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%) !important; 
            color: white !important; 
        }
        .theme-switcher-popup {
            position: fixed;
            top: 50px;
            right: 20px;
            background: #1a2235;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            min-width: 300px;
        }
        .theme-switcher-popup h3 {
            color: white;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .theme-option {
            display: block;
            padding: 10px;
            margin: 5px 0;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        .theme-option:hover {
            background: rgba(139,92,246,0.3);
            transform: translateY(-2px);
        }
        .theme-option.active {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        }
    </style>';
}
add_action('admin_head', 'billiardtoday_original_admin_styles');
add_action('wp_head', 'billiardtoday_original_admin_styles');

// Add theme switcher script
function billiardtoday_original_switcher_script() {
    if (!is_admin() && current_user_can('switch_themes')) {
        ?>
        <script>
        jQuery(document).ready(function($) {
            // Theme switcher popup
            var switcherHtml = `
                <div class="theme-switcher-popup" style="display: none;">
                    <h3>🎨 Switch Theme</h3>
                    <a href="#" class="theme-option" data-theme="billiardtoday-original">🌙 Original</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-original-light">☀️ Original Light</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-new">🌟 New</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-light">☀️ Light</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-minimal">📋 Minimal</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-dark-modern">🌚 Dark Modern</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-corporate">🏢 Corporate</a>
                    <a href="#" class="theme-option" data-theme="billiardtoday-sport-fun">🎮 Sport Fun</a>
                </div>
            `;
            $('body').append(switcherHtml);
            
            // Toggle switcher
            $('.theme-switcher-toggle').on('click', function(e) {
                e.preventDefault();
                $('.theme-switcher-popup').toggle();
            });
            
            // Close switcher when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.theme-switcher-toggle, .theme-switcher-popup').length) {
                    $('.theme-switcher-popup').hide();
                }
            });
            
            // Switch theme
            $('.theme-option').on('click', function(e) {
                e.preventDefault();
                var theme = $(this).data('theme');
                var $this = $(this);
                
                $.ajax({
                    url: billiardtoday_original.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'switch_theme',
                        theme: theme,
                        nonce: billiardtoday_original.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            location.reload();
                        }
                    }
                });
            });
            
            // Highlight current theme
            var currentTheme = '<?php echo get_option('stylesheet'); ?>';
            $('.theme-option[data-theme="' + currentTheme + '"]').addClass('active');
        });
        </script>
        <?php
    }
}
add_action('wp_footer', 'billiardtoday_original_switcher_script');
?>
