<?php
/**
 * Jetpack compatibility file.
 *
 * @package BilliardToday
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Jetpack setup function.
 *
 * See: https://jetpack.com/support/infinite-scroll/
 * See: https://jetpack.com/support/responsive-videos/
 * See: https://jetpack.com/support/content-options/
 */
function billiardtoday_dark_modern_jetpack_setup() {
    // Add theme support for Infinite Scroll.
    add_theme_support(
        'infinite-scroll',
        array(
            'container' => 'main',
            'render'    => 'billiardtoday_dark_modern_infinite_scroll_render',
            'footer'    => 'page',
            'type'      => 'click',
        )
    );

    // Add theme support for Responsive Videos.
    add_theme_support('jetpack-responsive-videos');

    // Add theme support for Content Options.
    add_theme_support(
        'jetpack-content-options',
        array(
            'post-details' => array(
                'stylesheet' => 'billiardtoday-dark-modern-style',
                'date'       => '.posted-on',
                'categories' => '.cat-links',
                'tags'       => '.tags-links',
                'author'     => '.byline',
                'comment'    => '.comments-link',
            ),
            'featured-images' => array(
                'archive' => true,
                'post'    => true,
                'page'    => true,
            ),
        )
    );
}
add_action('after_setup_theme', 'billiardtoday_dark_modern_jetpack_setup');

/**
 * Custom render function for Infinite Scroll.
 */
function billiardtoday_dark_modern_infinite_scroll_render() {
    while (have_posts()) {
        the_post();
        if (is_search()) :
            get_template_part('template-parts/content', 'search');
        else :
            get_template_part('template-parts/content', get_post_type());
        endif;
    }
}

/**
 * Add support for the Site Logo.
 *
 * @param array $args Site Logo arguments.
 * @return array Modified Site Logo arguments.
 */
function billiardtoday_dark_modern_site_logo_args($args) {
    $args['size'] = 'medium';
    return $args;
}
add_filter('jetpack_site_logo_args', 'billiardtoday_dark_modern_site_logo_args');

/**
 * Add support for the Social Menu.
 *
 * @param array $args Social Menu arguments.
 * @return array Modified Social Menu arguments.
 */
function billiardtoday_dark_modern_social_menu_args($args) {
    $args['menu_class'] = 'social-links-menu dark-modern-social';
    return $args;
}
add_filter('jetpack_social_menu_args', 'billiardtoday_dark_modern_social_menu_args');

/**
 * Add support for the Related Posts.
 *
 * @param array $options Related Posts options.
 * @return array Modified Related Posts options.
 */
function billiardtoday_dark_modern_related_posts_filter($options) {
    $options['show_headline'] = false;
    $options['layout'] = 'grid';
    $options['headline'] = __('Related Posts', 'billiardtoday');
    return $options;
}
add_filter('jetpack_relatedposts_filter_options', 'billiardtoday_dark_modern_related_posts_filter');

/**
 * Add support for the Tiled Gallery.
 *
 * @param array $defaults Tiled Gallery defaults.
 * @return array Modified Tiled Gallery defaults.
 */
function billiardtoday_dark_modern_tiled_gallery_defaults($defaults) {
    $defaults['type'] = 'rectangular';
    $defaults['link'] = 'post';
    $defaults['grayscale'] = false;
    return $defaults;
}
add_filter('jetpack_default_tiled_gallery', 'billiardtoday_dark_modern_tiled_gallery_defaults');

/**
 * Add support for the Photon.
 *
 * @param array $args Photon arguments.
 * @return array Modified Photon arguments.
 */
function billiardtoday_dark_modern_photon_args($args) {
    $args['exclude'] = array('avatar');
    return $args;
}
add_filter('jetpack_photon_post_image_args', 'billiardtoday_dark_modern_photon_args');

/**
 * Add support for the Lazy Images.
 *
 * @param array $attributes Lazy Images attributes.
 * @return array Modified Lazy Images attributes.
 */
function billiardtoday_dark_modern_lazy_images_attributes($attributes) {
    $attributes['class'] .= ' lazyload dark-modern-lazy';
    return $attributes;
}
add_filter('jetpack_lazy_images_attributes', 'billiardtoday_dark_modern_lazy_images_attributes');

/**
 * Add support for the Carousel.
 *
 * @param array $options Carousel options.
 * @return array Modified Carousel options.
 */
function billiardtoday_dark_modern_carousel_options($options) {
    $options['local'] = true;
    $options['width'] = 800;
    $options['height'] = 600;
    $options['background'] = 'black';
    return $options;
}
add_filter('jetpack_carousel_options', 'billiardtoday_dark_modern_carousel_options');

/**
 * Add support for the Widget Visibility.
 *
 * @param array $display Widget Visibility display rules.
 * @param array $widget Widget data.
 * @return array Modified Widget Visibility display rules.
 */
function billiardtoday_dark_modern_widget_visibility_display($display, $widget) {
    // Add custom visibility logic for dark theme
    if (isset($widget['classname']) && strpos($widget['classname'], 'dark-modern') !== false) {
        return true;
    }
    return $display;
}
add_filter('widget_display_callback', 'billiardtoday_dark_modern_widget_visibility_display', 10, 2);

/**
 * Add support for the Publicize.
 *
 * @param array $post_data Publicize post data.
 * @param int $post_id Post ID.
 * @return array Modified Publicize post data.
 */
function billiardtoday_dark_modern_publicize_post_data($post_data, $post_id) {
    $post_data['title'] = get_the_title($post_id) . ' - BilliardToday Dark Modern';
    $post_data['description'] = 'Modern dark theme for billiard tournament management';
    return $post_data;
}
add_filter('jetpack_publicize_post_data', 'billiardtoday_dark_modern_publicize_post_data', 10, 2);

/**
 * Add support for the Sharing.
 *
 * @param array $services Sharing services.
 * @return array Modified Sharing services.
 */
function billiardtoday_dark_modern_sharing_services($services) {
    // Add dark theme styling to sharing buttons
    $services['style'] = 'icon';
    $services['label'] = false;
    return $services;
}
add_filter('jetpack_sharing_services', 'billiardtoday_dark_modern_sharing_services');

/**
 * Add support for the Likes.
 *
 * @param bool $enabled Whether Likes are enabled.
 * @return bool Modified Likes enabled status.
 */
function billiardtoday_dark_modern_likes_enabled($enabled) {
    // Enable likes with dark theme styling
    return $enabled;
}
add_filter('jetpack_likes_enabled', 'billiardtoday_dark_modern_likes_enabled');

/**
 * Add support for the Subscriptions.
 *
 * @param bool $enabled Whether Subscriptions are enabled.
 * @return bool Modified Subscriptions enabled status.
 */
function billiardtoday_dark_modern_subscriptions_enabled($enabled) {
    // Enable subscriptions with dark theme styling
    return $enabled;
}
add_filter('jetpack_subscriptions_enabled', 'billiardtoday_dark_modern_subscriptions_enabled');

/**
 * Add support for the Markdown.
 *
 * @param array $args Markdown arguments.
 * @return array Modified Markdown arguments.
 */
function billiardtoday_dark_modern_markdown_args($args) {
    $args['id'] = 'billiardtoday-dark-modern-markdown';
    return $args;
}
add_filter('wp_markdown_args', 'billiardtoday_dark_modern_markdown_args');

/**
 * Add support for the Contact Form.
 *
 * @param array $fields Contact Form fields.
 * @return array Modified Contact Form fields.
 */
function billiardtoday_dark_modern_contact_form_fields($fields) {
    // Add dark theme styling to contact form fields
    $fields['submit_class'] = 'btn btn-primary dark-modern-submit';
    return $fields;
}
add_filter('jetpack_contact_form_fields', 'billiardtoday_dark_modern_contact_form_fields');

/**
 * Add support for the Shortcodes.
 *
 * @param array $shortcodes Shortcodes.
 * @return array Modified Shortcodes.
 */
function billiardtoday_dark_modern_shortcodes($shortcodes) {
    // Add dark theme specific shortcodes
    $shortcodes['dark_modern_card'] = 'billiardtoday_dark_modern_card_shortcode';
    return $shortcodes;
}
add_filter('jetpack_shortcodes', 'billiardtoday_dark_modern_shortcodes');

/**
 * Custom shortcode for dark modern cards
 */
function billiardtoday_dark_modern_card_shortcode($atts, $content = '') {
    $atts = shortcode_atts(array(
        'title' => '',
        'icon' => '',
        'gradient' => 'default',
    ), $atts, 'dark_modern_card');

    $gradient_classes = array(
        'default' => 'gradient-default',
        'primary' => 'gradient-primary',
        'secondary' => 'gradient-secondary',
    );

    $gradient_class = isset($gradient_classes[$atts['gradient']]) ? $gradient_classes[$atts['gradient']] : $gradient_classes['default'];

    $output = '<div class="dark-modern-card ' . esc_attr($gradient_class) . '">';
    
    if ($atts['icon']) {
        $output .= '<div class="card-icon">' . esc_html($atts['icon']) . '</div>';
    }
    
    if ($atts['title']) {
        $output .= '<h3 class="card-title">' . esc_html($atts['title']) . '</h3>';
    }
    
    $output .= '<div class="card-content">' . do_shortcode($content) . '</div>';
    $output .= '</div>';

    return $output;
}

/**
 * Add support for the Widgets.
 *
 * @param array $widgets Widgets.
 * @return array Modified Widgets.
 */
function billiardtoday_dark_modern_widgets($widgets) {
    // Add dark theme specific widgets
    $widgets['dark_modern_stats'] = 'BilliardToday_Dark_Modern_Stats_Widget';
    $widgets['dark_modern_featured'] = 'BilliardToday_Dark_Modern_Featured_Widget';
    return $widgets;
}
add_filter('jetpack_widgets', 'billiardtoday_dark_modern_widgets');

/**
 * Dark Modern Stats Widget
 */
class BilliardToday_Dark_Modern_Stats_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'dark_modern_stats',
            __('Dark Modern Stats', 'billiardtoday'),
            array('description' => __('Display tournament statistics in dark modern style', 'billiardtoday'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        echo '<div class="dark-modern-stats-widget">';
        echo '<h3 class="widget-title">' . esc_html($instance['title']) . '</h3>';
        echo '<div class="stats-content">';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['tournaments']) . '</span><span class="stat-label">' . __('Tournaments', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['players']) . '</span><span class="stat-label">' . __('Players', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['prizes']) . '</span><span class="stat-label">' . __('Prizes', 'billiardtoday') . '</span></div>';
        echo '</div>';
        echo '</div>';
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Statistics', 'billiardtoday');
        $tournaments = !empty($instance['tournaments']) ? $instance['tournaments'] : '0';
        $players = !empty($instance['players']) ? $instance['players'] : '0';
        $prizes = !empty($instance['prizes']) ? $instance['prizes'] : '0';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('tournaments'); ?>"><?php _e('Tournaments:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('tournaments'); ?>" name="<?php echo $this->get_field_name('tournaments'); ?>" type="text" value="<?php echo esc_attr($tournaments); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('players'); ?>"><?php _e('Players:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('players'); ?>" name="<?php echo $this->get_field_name('players'); ?>" type="text" value="<?php echo esc_attr($players); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('prizes'); ?>"><?php _e('Prizes:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('prizes'); ?>" name="<?php echo $this->get_field_name('prizes'); ?>" type="text" value="<?php echo esc_attr($prizes); ?>">
        </p>
        <?php
    }
}

/**
 * Add support for the Custom CSS.
 *
 * @param string $css Custom CSS.
 * @return string Modified Custom CSS.
 */
function billiardtoday_dark_modern_custom_css($css) {
    // Add dark modern specific CSS
    $dark_modern_css = '
        /* Dark Modern Jetpack Styles */
        .jetpack-widget-social-icons ul li a {
            background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%);
            border-radius: 8px;
            color: white;
        }
        
        .jetpack-widget-social-icons ul li a:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4);
        }
        
        .dark-modern-stats-widget {
            background: #1e1e1e;
            border: 1px solid #2a2a2a;
            border-radius: 12px;
            padding: 20px;
        }
        
        .dark-modern-stats-widget .widget-title {
            color: #ffffff;
            margin-bottom: 15px;
        }
        
        .stats-content {
            display: flex;
            justify-content: space-between;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-number {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: #00d4ff;
        }
        
        .stat-label {
            display: block;
            font-size: 12px;
            color: #a0a0a0;
            text-transform: uppercase;
        }
        
        .dark-modern-card {
            background: #1e1e1e;
            border: 1px solid #2a2a2a;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .dark-modern-card.gradient-default {
            background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
        }
        
        .dark-modern-card.gradient-primary {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(255, 0, 110, 0.1) 100%);
        }
        
        .card-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #00d4ff;
        }
        
        .card-title {
            color: #ffffff;
            margin-bottom: 10px;
        }
        
        .card-content {
            color: #a0a0a0;
        }
    ';
    
    return $css . $dark_modern_css;
}
add_filter('jetpack_custom_css', 'billiardtoday_dark_modern_custom_css');

/**
 * Add support for the Analytics.
 *
 * @param array $options Analytics options.
 * @return array Modified Analytics options.
 */
function billiardtoday_dark_modern_analytics_options($options) {
    $options['track_dark_mode'] = true;
    return $options;
}
add_filter('jetpack_analytics_options', 'billiardtoday_dark_modern_analytics_options');

/**
 * Add dark modern Jetpack customizations
 */
function billiardtoday_dark_modern_jetpack_customizations() {
    // Remove unnecessary Jetpack features for dark theme
    add_filter('jetpack_implode_frontend_css', '__return_false');
    
    // Optimize Jetpack for dark modern design
    add_filter('jetpack_open_graph_tags', function($tags) {
        $tags['og:title'] = get_bloginfo('name') . ' - Dark Modern Theme';
        $tags['og:description'] = 'Modern dark theme for billiard tournament management';
        $tags['og:image'] = get_template_directory_uri() . '/assets/dark-modern-og.jpg';
        return $tags;
    });
    
    // Add dark modern Jetpack CSS
    wp_add_inline_style('jetpack_css', '
        .jetpack-infinite-scroll-loader {
            background: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            color: #00d4ff;
        }
        
        .infinite-loader .spinner {
            border-top-color: #00d4ff;
        }
        
        .jetpack-carousel-wrapper {
            background: #0a0a0a;
        }
        
        .jetpack-carousel-caption {
            background: rgba(26, 26, 26, 0.9);
            color: #ffffff;
        }
        
        .jp-carousel-slide-selected img {
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
        }
    ');
}
add_action('init', 'billiardtoday_dark_modern_jetpack_customizations');
?>
