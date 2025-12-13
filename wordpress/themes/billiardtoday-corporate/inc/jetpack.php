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
function billiardtoday_corporate_jetpack_setup() {
    // Add theme support for Infinite Scroll.
    add_theme_support(
        'infinite-scroll',
        array(
            'container' => 'main',
            'render'    => 'billiardtoday_corporate_infinite_scroll_render',
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
                'stylesheet' => 'billiardtoday-corporate-style',
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
add_action('after_setup_theme', 'billiardtoday_corporate_jetpack_setup');

/**
 * Custom render function for Infinite Scroll.
 */
function billiardtoday_corporate_infinite_scroll_render() {
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
function billiardtoday_corporate_site_logo_args($args) {
    $args['size'] = 'medium';
    return $args;
}
add_filter('jetpack_site_logo_args', 'billiardtoday_corporate_site_logo_args');

/**
 * Add support for the Social Menu.
 *
 * @param array $args Social Menu arguments.
 * @return array Modified Social Menu arguments.
 */
function billiardtoday_corporate_social_menu_args($args) {
    $args['menu_class'] = 'social-links-menu corporate-social';
    return $args;
}
add_filter('jetpack_social_menu_args', 'billiardtoday_corporate_social_menu_args');

/**
 * Add support for the Related Posts.
 *
 * @param array $options Related Posts options.
 * @return array Modified Related Posts options.
 */
function billiardtoday_corporate_related_posts_filter($options) {
    $options['show_headline'] = false;
    $options['layout'] = 'grid';
    $options['headline'] = __('Related Posts', 'billiardtoday');
    return $options;
}
add_filter('jetpack_relatedposts_filter_options', 'billiardtoday_corporate_related_posts_filter');

/**
 * Add support for the Tiled Gallery.
 *
 * @param array $defaults Tiled Gallery defaults.
 * @return array Modified Tiled Gallery defaults.
 */
function billiardtoday_corporate_tiled_gallery_defaults($defaults) {
    $defaults['type'] = 'rectangular';
    $defaults['link'] = 'post';
    $defaults['grayscale'] = false;
    return $defaults;
}
add_filter('jetpack_default_tiled_gallery', 'billiardtoday_corporate_tiled_gallery_defaults');

/**
 * Add support for the Photon.
 *
 * @param array $args Photon arguments.
 * @return array Modified Photon arguments.
 */
function billiardtoday_corporate_photon_args($args) {
    $args['exclude'] = array('avatar');
    return $args;
}
add_filter('jetpack_photon_post_image_args', 'billiardtoday_corporate_photon_args');

/**
 * Add support for the Lazy Images.
 *
 * @param array $attributes Lazy Images attributes.
 * @return array Modified Lazy Images attributes.
 */
function billiardtoday_corporate_lazy_images_attributes($attributes) {
    $attributes['class'] .= ' lazyload corporate-lazy';
    return $attributes;
}
add_filter('jetpack_lazy_images_attributes', 'billiardtoday_corporate_lazy_images_attributes');

/**
 * Add support for the Carousel.
 *
 * @param array $options Carousel options.
 * @return array Modified Carousel options.
 */
function billiardtoday_corporate_carousel_options($options) {
    $options['local'] = true;
    $options['width'] = 800;
    $options['height'] = 600;
    $options['background'] = 'white';
    return $options;
}
add_filter('jetpack_carousel_options', 'billiardtoday_corporate_carousel_options');

/**
 * Add support for the Widget Visibility.
 *
 * @param array $display Widget Visibility display rules.
 * @param array $widget Widget data.
 * @return array Modified Widget Visibility display rules.
 */
function billiardtoday_corporate_widget_visibility_display($display, $widget) {
    // Add custom visibility logic for corporate theme
    if (isset($widget['classname']) && strpos($widget['classname'], 'corporate') !== false) {
        return true;
    }
    return $display;
}
add_filter('widget_display_callback', 'billiardtoday_corporate_widget_visibility_display', 10, 2);

/**
 * Add support for the Publicize.
 *
 * @param array $post_data Publicize post data.
 * @param int $post_id Post ID.
 * @return array Modified Publicize post data.
 */
function billiardtoday_corporate_publicize_post_data($post_data, $post_id) {
    $post_data['title'] = get_the_title($post_id) . ' - BilliardToday Corporate';
    $post_data['description'] = 'Professional corporate tournament management platform';
    return $post_data;
}
add_filter('jetpack_publicize_post_data', 'billiardtoday_corporate_publicize_post_data', 10, 2);

/**
 * Add support for the Sharing.
 *
 * @param array $services Sharing services.
 * @return array Modified Sharing services.
 */
function billiardtoday_corporate_sharing_services($services) {
    // Add corporate theme styling to sharing buttons
    $services['style'] = 'icon';
    $services['label'] = false;
    return $services;
}
add_filter('jetpack_sharing_services', 'billiardtoday_corporate_sharing_services');

/**
 * Add support for the Likes.
 *
 * @param bool $enabled Whether Likes are enabled.
 * @return bool Modified Likes enabled status.
 */
function billiardtoday_corporate_likes_enabled($enabled) {
    // Enable likes with corporate theme styling
    return $enabled;
}
add_filter('jetpack_likes_enabled', 'billiardtoday_corporate_likes_enabled');

/**
 * Add support for the Subscriptions.
 *
 * @param bool $enabled Whether Subscriptions are enabled.
 * @return bool Modified Subscriptions enabled status.
 */
function billiardtoday_corporate_subscriptions_enabled($enabled) {
    // Enable subscriptions with corporate theme styling
    return $enabled;
}
add_filter('jetpack_subscriptions_enabled', 'billiardtoday_corporate_subscriptions_enabled');

/**
 * Add support for the Markdown.
 *
 * @param array $args Markdown arguments.
 * @return array Modified Markdown arguments.
 */
function billiardtoday_corporate_markdown_args($args) {
    $args['id'] = 'billiardtoday-corporate-markdown';
    return $args;
}
add_filter('wp_markdown_args', 'billiardtoday_corporate_markdown_args');

/**
 * Add support for the Contact Form.
 *
 * @param array $fields Contact Form fields.
 * @return array Modified Contact Form fields.
 */
function billiardtoday_corporate_contact_form_fields($fields) {
    // Add corporate theme styling to contact form fields
    $fields['submit_class'] = 'btn btn-primary corporate-submit';
    return $fields;
}
add_filter('jetpack_contact_form_fields', 'billiardtoday_corporate_contact_form_fields');

/**
 * Add support for the Shortcodes.
 *
 * @param array $shortcodes Shortcodes.
 * @return array Modified Shortcodes.
 */
function billiardtoday_corporate_shortcodes($shortcodes) {
    // Add corporate theme specific shortcodes
    $shortcodes['corporate_card'] = 'billiardtoday_corporate_card_shortcode';
    $shortcodes['corporate_stats'] = 'billiardtoday_corporate_stats_shortcode';
    return $shortcodes;
}
add_filter('jetpack_shortcodes', 'billiardtoday_corporate_shortcodes');

/**
 * Custom shortcode for corporate cards
 */
function billiardtoday_corporate_card_shortcode($atts, $content = '') {
    $atts = shortcode_atts(array(
        'title' => '',
        'icon' => '',
        'type' => 'default',
    ), $atts, 'corporate_card');

    $type_classes = array(
        'default' => 'corporate-card-default',
        'primary' => 'corporate-card-primary',
        'secondary' => 'corporate-card-secondary',
    );

    $type_class = isset($type_classes[$atts['type']]) ? $type_classes[$atts['type']] : $type_classes['default'];

    $output = '<div class="corporate-card ' . esc_attr($type_class) . '">';
    
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
 * Custom shortcode for corporate stats
 */
function billiardtoday_corporate_stats_shortcode($atts) {
    $atts = shortcode_atts(array(
        'clients' => '500+',
        'tournaments' => '10K+',
        'players' => '50K+',
        'uptime' => '99.9%',
    ), $atts, 'corporate_stats');

    $output = '<div class="corporate-stats-grid">';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['clients']) . '</span><span class="stat-label">' . __('Corporate Clients', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['tournaments']) . '</span><span class="stat-label">' . __('Tournaments', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['players']) . '</span><span class="stat-label">' . __('Active Players', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['uptime']) . '</span><span class="stat-label">' . __('Uptime', 'billiardtoday') . '</span></div>';
    $output .= '</div>';

    return $output;
}

/**
 * Add support for the Widgets.
 *
 * @param array $widgets Widgets.
 * @return array Modified Widgets.
 */
function billiardtoday_corporate_widgets($widgets) {
    // Add corporate theme specific widgets
    $widgets['corporate_stats'] = 'BilliardToday_Corporate_Stats_Widget';
    $widgets['corporate_clients'] = 'BilliardToday_Corporate_Clients_Widget';
    return $widgets;
}
add_filter('jetpack_widgets', 'billiardtoday_corporate_widgets');

/**
 * Corporate Stats Widget
 */
class BilliardToday_Corporate_Stats_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'corporate_stats',
            __('Corporate Stats', 'billiardtoday'),
            array('description' => __('Display corporate statistics in professional style', 'billiardtoday'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        echo '<div class="corporate-stats-widget">';
        echo '<h3 class="widget-title">' . esc_html($instance['title']) . '</h3>';
        echo '<div class="stats-content">';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['clients']) . '</span><span class="stat-label">' . __('Clients', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['tournaments']) . '</span><span class="stat-label">' . __('Tournaments', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['players']) . '</span><span class="stat-label">' . __('Players', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['uptime']) . '</span><span class="stat-label">' . __('Uptime', 'billiardtoday') . '</span></div>';
        echo '</div>';
        echo '</div>';
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Corporate Statistics', 'billiardtoday');
        $clients = !empty($instance['clients']) ? $instance['clients'] : '500+';
        $tournaments = !empty($instance['tournaments']) ? $instance['tournaments'] : '10K+';
        $players = !empty($instance['players']) ? $instance['players'] : '50K+';
        $uptime = !empty($instance['uptime']) ? $instance['uptime'] : '99.9%';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('clients'); ?>"><?php _e('Clients:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('clients'); ?>" name="<?php echo $this->get_field_name('clients'); ?>" type="text" value="<?php echo esc_attr($clients); ?>">
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
            <label for="<?php echo $this->get_field_id('uptime'); ?>"><?php _e('Uptime:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('uptime'); ?>" name="<?php echo $this->get_field_name('uptime'); ?>" type="text" value="<?php echo esc_attr($uptime); ?>">
        </p>
        <?php
    }
}

/**
 * Corporate Clients Widget
 */
class BilliardToday_Corporate_Clients_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'corporate_clients',
            __('Corporate Clients', 'billiardtoday'),
            array('description' => __('Display featured corporate clients', 'billiardtoday'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        echo '<div class="corporate-clients-widget">';
        echo '<h3 class="widget-title">' . esc_html($instance['title']) . '</h3>';
        echo '<div class="clients-content">';
        
        // Display client logos or names
        $clients = array(
            'Fortune 500',
            'Enterprise Corp',
            'Global Industries',
            'Tech Leaders',
            'Financial Services'
        );
        
        foreach ($clients as $client) {
            echo '<div class="client-item">' . esc_html($client) . '</div>';
        }
        
        echo '</div>';
        echo '</div>';
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Our Clients', 'billiardtoday');
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
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
function billiardtoday_corporate_custom_css($css) {
    // Add corporate specific CSS
    $corporate_css = '
        /* Corporate Jetpack Styles */
        .jetpack-widget-social-icons ul li a {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            border-radius: 8px;
            color: white;
        }
        
        .jetpack-widget-social-icons ul li a:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
        }
        
        .corporate-stats-widget {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
        }
        
        .corporate-stats-widget .widget-title {
            color: #1e293b;
            margin-bottom: 15px;
        }
        
        .stats-content {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        
        .stat-item {
            text-align: center;
            min-width: 100px;
        }
        
        .stat-number {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
        }
        
        .stat-label {
            display: block;
            font-size: 12px;
            color: #475569;
            text-transform: uppercase;
        }
        
        .corporate-clients-widget {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
        }
        
        .client-item {
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
            color: #475569;
            font-weight: 500;
        }
        
        .client-item:last-child {
            border-bottom: none;
        }
        
        .corporate-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .corporate-card.corporate-card-primary {
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        }
        
        .corporate-card.corporate-card-secondary {
            background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
        }
        
        .card-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #3b82f6;
        }
        
        .card-title {
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .card-content {
            color: #475569;
        }
        
        .corporate-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
    ';
    
    return $css . $corporate_css;
}
add_filter('jetpack_custom_css', 'billiardtoday_corporate_custom_css');

/**
 * Add support for the Analytics.
 *
 * @param array $options Analytics options.
 * @return array Modified Analytics options.
 */
function billiardtoday_corporate_analytics_options($options) {
    $options['track_corporate'] = true;
    return $options;
}
add_filter('jetpack_analytics_options', 'billiardtoday_corporate_analytics_options');

/**
 * Add corporate Jetpack customizations
 */
function billiardtoday_corporate_jetpack_customizations() {
    // Remove unnecessary Jetpack features for corporate theme
    add_filter('jetpack_implode_frontend_css', '__return_false');
    
    // Optimize Jetpack for corporate design
    add_filter('jetpack_open_graph_tags', function($tags) {
        $tags['og:title'] = get_bloginfo('name') . ' - Corporate Theme';
        $tags['og:description'] = 'Professional corporate tournament management platform';
        $tags['og:image'] = get_template_directory_uri() . '/assets/corporate-og.jpg';
        return $tags;
    });
    
    // Add corporate Jetpack CSS
    wp_add_inline_style('jetpack_css', '
        .jetpack-infinite-scroll-loader {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            color: #3b82f6;
        }
        
        .infinite-loader .spinner {
            border-top-color: #3b82f6;
        }
        
        .jetpack-carousel-wrapper {
            background: #ffffff;
        }
        
        .jetpack-carousel-caption {
            background: rgba(255, 255, 255, 0.95);
            color: #1e293b;
        }
        
        .jp-carousel-slide-selected img {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
        }
    ');
}
add_action('init', 'billiardtoday_corporate_jetpack_customizations');
?>
