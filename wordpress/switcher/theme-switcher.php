<?php
/**
 * WordPress Theme Switcher for BilliardToday
 * Allows switching between 8 different theme variations
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class BilliardTodayThemeSwitcher {
    
    private $themes = array(
        'billiardtoday-original' => array(
            'name' => '🌙 Original',
            'description' => 'Dark theme with neon effects',
            'preview' => 'original-preview.jpg'
        ),
        'billiardtoday-original-light' => array(
            'name' => '☀️ Original Light',
            'description' => 'Light version of original design',
            'preview' => 'original-light-preview.jpg'
        ),
        'billiardtoday-new' => array(
            'name' => '🌟 New',
            'description' => 'Modern gradient design',
            'preview' => 'new-preview.jpg'
        ),
        'billiardtoday-light' => array(
            'name' => '☀️ Light',
            'description' => 'Clean and bright design',
            'preview' => 'light-preview.jpg'
        ),
        'billiardtoday-minimal' => array(
            'name' => '📋 Minimal',
            'description' => 'Ultra-minimalist design',
            'preview' => 'minimal-preview.jpg'
        ),
        'billiardtoday-dark-modern' => array(
            'name' => '🌚 Dark Modern',
            'description' => 'Bold dark theme with modern effects',
            'preview' => 'dark-modern-preview.jpg'
        ),
        'billiardtoday-corporate' => array(
            'name' => '🏢 Corporate',
            'description' => 'Professional enterprise design',
            'preview' => 'corporate-preview.jpg'
        ),
        'billiardtoday-sport-fun' => array(
            'name' => '🎮 Sport Fun',
            'description' => 'Colorful and playful design',
            'preview' => 'sport-fun-preview.jpg'
        )
    );
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_switch_theme', array($this, 'ajax_switch_theme'));
        add_action('wp_ajax_nopriv_switch_theme', array($this, 'ajax_switch_theme'));
        add_action('wp_footer', array($this, 'render_switcher'));
        add_action('admin_bar_menu', array($this, 'add_admin_bar_switcher'), 999);
        add_action('wp_head', array($this, 'add_custom_styles'));
    }
    
    public function enqueue_scripts() {
        // Switcher CSS
        wp_enqueue_style('billiardtoday-switcher', plugin_dir_url(__FILE__) . 'switcher.css', array(), '1.0.0');
        
        // Switcher JavaScript
        wp_enqueue_script('billiardtoday-switcher', plugin_dir_url(__FILE__) . 'switcher.js', array('jquery'), '1.0.0', true);
        
        // Localize script
        wp_localize_script('billiardtoday-switcher', 'billiardtoday_switcher', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('switch_theme_nonce'),
            'current_theme' => get_option('stylesheet'),
            'themes' => $this->themes,
            'can_switch' => current_user_can('switch_themes')
        ));
    }
    
    public function ajax_switch_theme() {
        check_ajax_referer('switch_theme_nonce', 'nonce');
        
        if (!current_user_can('switch_themes')) {
            wp_send_json_error('Permission denied');
        }
        
        if (isset($_POST['theme'])) {
            $theme = sanitize_text_field($_POST['theme']);
            
            if (array_key_exists($theme, $this->themes)) {
                switch_theme($theme);
                wp_send_json_success(array(
                    'theme' => $theme,
                    'name' => $this->themes[$theme]['name']
                ));
            }
        }
        
        wp_send_json_error('Invalid theme');
    }
    
    public function render_switcher() {
        // Only show switcher if user can switch themes or in demo mode
        if (!current_user_can('switch_themes') && !isset($_GET['demo'])) {
            return;
        }
        
        $current_theme = get_option('stylesheet');
        ?>
        <div class="billiardtoday-theme-switcher" id="billiardtoday-theme-switcher">
            <div class="switcher-toggle">
                <span class="toggle-icon">🎨</span>
                <span class="toggle-text">Switch Theme</span>
            </div>
            
            <div class="switcher-panel">
                <div class="switcher-header">
                    <h3>🎨 Choose Theme</h3>
                    <button class="close-switcher">&times;</button>
                </div>
                
                <div class="switcher-content">
                    <div class="theme-grid">
                        <?php foreach ($this->themes as $theme_key => $theme_info): ?>
                        <div class="theme-option <?php echo $theme_key === $current_theme ? 'active' : ''; ?>" 
                             data-theme="<?php echo esc_attr($theme_key); ?>">
                            <div class="theme-preview">
                                <div class="preview-placeholder">
                                    <span class="theme-emoji"><?php echo esc_html($theme_info['name']); ?></span>
                                </div>
                            </div>
                            <div class="theme-info">
                                <h4><?php echo esc_html($theme_info['name']); ?></h4>
                                <p><?php echo esc_html($theme_info['description']); ?></p>
                            </div>
                            <div class="theme-status">
                                <?php if ($theme_key === $current_theme): ?>
                                    <span class="active-badge">Active</span>
                                <?php else: ?>
                                    <button class="activate-btn">Activate</button>
                                <?php endif; ?>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                
                <div class="switcher-footer">
                    <div class="current-theme">
                        <strong>Current:</strong> 
                        <span id="current-theme-name"><?php echo esc_html($this->themes[$current_theme]['name']); ?></span>
                    </div>
                    <button class="reset-btn" onclick="location.reload()">Reset View</button>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function add_admin_bar_switcher($wp_admin_bar) {
        if (!current_user_can('switch_themes')) {
            return;
        }
        
        $current_theme = get_option('stylesheet');
        $current_name = $this->themes[$current_theme]['name'];
        
        // Main switcher menu
        $args = array(
            'id'    => 'billiardtheme-switcher',
            'title' => $current_name . ' 🎨',
            'href'  => '#',
            'meta'  => array(
                'class' => 'billiardtheme-switcher-toggle',
                'title' => 'Switch BilliardToday Theme'
            ),
        );
        $wp_admin_bar->add_node($args);
        
        // Add theme options
        foreach ($this->themes as $theme_key => $theme_info) {
            $args = array(
                'id'     => 'theme-' . $theme_key,
                'title'  => $theme_info['name'],
                'parent' => 'billiardtheme-switcher',
                'href'   => '#',
                'meta'   => array(
                    'class' => 'theme-switcher-option',
                    'data-theme' => $theme_key,
                    'title' => $theme_info['description']
                ),
            );
            $wp_admin_bar->add_node($args);
        }
    }
    
    public function add_custom_styles() {
        ?>
        <style>
        /* Admin bar switcher styling */
        #wpadminbar .billiardtheme-switcher-toggle {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
            color: white !important;
        }
        
        #wpadminbar .theme-switcher-option {
            position: relative;
        }
        
        #wpadminbar .theme-switcher-option.active::before {
            content: '✓';
            position: absolute;
            left: 10px;
            color: #10b981;
            font-weight: bold;
        }
        
        /* Theme switcher positioning for different screen sizes */
        @media (max-width: 768px) {
            .billiardtoday-theme-switcher {
                bottom: 20px !important;
                top: auto !important;
                right: 20px !important;
            }
        }
        
        /* Hide switcher in print */
        @media print {
            .billiardtoday-theme-switcher {
                display: none !important;
            }
        }
        </style>
        <?php
    }
}

// Initialize the theme switcher
new BilliardTodayThemeSwitcher();

// Helper function to get current theme info
function billiardtoday_get_current_theme_info() {
    $switcher = new BilliardTodayThemeSwitcher();
    $themes = $switcher->themes;
    $current = get_option('stylesheet');
    
    return isset($themes[$current]) ? $themes[$current] : array(
        'name' => 'Unknown',
        'description' => 'Theme information not available'
    );
}

// Shortcode to display theme switcher
add_shortcode('billiardtheme_switcher', function() {
    if (!current_user_can('switch_themes') && !isset($_GET['demo'])) {
        return '<p>You do not have permission to switch themes.</p>';
    }
    
    ob_start();
    $switcher = new BilliardTodayThemeSwitcher();
    $switcher->render_switcher();
    return ob_get_clean();
});

// Widget support
add_action('widgets_init', function() {
    register_widget('BilliardTodayThemeSwitcher_Widget');
});

class BilliardTodayThemeSwitcher_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'billiardtheme_switcher',
            'BilliardToday Theme Switcher',
            array('description' => 'Switch between BilliardToday theme variations')
        );
    }
    
    public function widget($args, $instance) {
        if (!current_user_can('switch_themes') && !isset($_GET['demo'])) {
            return;
        }
        
        echo $args['before_widget'];
        
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        
        $switcher = new BilliardTodayThemeSwitcher();
        $switcher->render_switcher();
        
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : 'Theme Switcher';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>">
                <?php esc_attr_e('Title:'); ?>
            </label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>"
                   name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text"
                   value="<?php echo esc_attr($title); ?>">
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        return $instance;
    }
}
?>
