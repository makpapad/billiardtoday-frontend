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
function billiardtoday_sport_fun_jetpack_setup() {
    // Add theme support for Infinite Scroll.
    add_theme_support(
        'infinite-scroll',
        array(
            'container' => 'main',
            'render'    => 'billiardtoday_sport_fun_infinite_scroll_render',
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
                'stylesheet' => 'billiardtoday-sport-fun-style',
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
add_action('after_setup_theme', 'billiardtoday_sport_fun_jetpack_setup');

/**
 * Custom render function for Infinite Scroll.
 */
function billiardtoday_sport_fun_infinite_scroll_render() {
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
function billiardtoday_sport_fun_site_logo_args($args) {
    $args['size'] = 'medium';
    return $args;
}
add_filter('jetpack_site_logo_args', 'billiardtoday_sport_fun_site_logo_args');

/**
 * Add support for the Social Menu.
 *
 * @param array $args Social Menu arguments.
 * @return array Modified Social Menu arguments.
 */
function billiardtoday_sport_fun_social_menu_args($args) {
    $args['menu_class'] = 'social-links-menu sport-fun-social';
    return $args;
}
add_filter('jetpack_social_menu_args', 'billiardtoday_sport_fun_social_menu_args');

/**
 * Add support for the Related Posts.
 *
 * @param array $options Related Posts options.
 * @return array Modified Related Posts options.
 */
function billiardtoday_sport_fun_related_posts_filter($options) {
    $options['show_headline'] = false;
    $options['layout'] = 'grid';
    $options['headline'] = __('Related Games', 'billiardtoday');
    return $options;
}
add_filter('jetpack_relatedposts_filter_options', 'billiardtoday_sport_fun_related_posts_filter');

/**
 * Add support for the Tiled Gallery.
 *
 * @param array $defaults Tiled Gallery defaults.
 * @return array Modified Tiled Gallery defaults.
 */
function billiardtoday_sport_fun_tiled_gallery_defaults($defaults) {
    $defaults['type'] = 'rectangular';
    $defaults['link'] = 'post';
    $defaults['grayscale'] = false;
    return $defaults;
}
add_filter('jetpack_default_tiled_gallery', 'billiardtoday_sport_fun_tiled_gallery_defaults');

/**
 * Add support for the Photon.
 *
 * @param array $args Photon arguments.
 * @return array Modified Photon arguments.
 */
function billiardtoday_sport_fun_photon_args($args) {
    $args['exclude'] = array('avatar');
    return $args;
}
add_filter('jetpack_photon_post_image_args', 'billiardtoday_sport_fun_photon_args');

/**
 * Add support for the Lazy Images.
 *
 * @param array $attributes Lazy Images attributes.
 * @return array Modified Lazy Images attributes.
 */
function billiardtoday_sport_fun_lazy_images_attributes($attributes) {
    $attributes['class'] .= ' lazyload sport-fun-lazy';
    return $attributes;
}
add_filter('jetpack_lazy_images_attributes', 'billiardtoday_sport_fun_lazy_images_attributes');

/**
 * Add support for the Carousel.
 *
 * @param array $options Carousel options.
 * @return array Modified Carousel options.
 */
function billiardtoday_sport_fun_carousel_options($options) {
    $options['local'] = true;
    $options['width'] = 800;
    $options['height'] = 600;
    $options['background'] = 'white';
    return $options;
}
add_filter('jetpack_carousel_options', 'billiardtoday_sport_fun_carousel_options');

/**
 * Add support for the Widget Visibility.
 *
 * @param array $display Widget Visibility display rules.
 * @param array $widget Widget data.
 * @return array Modified Widget Visibility display rules.
 */
function billiardtoday_sport_fun_widget_visibility_display($display, $widget) {
    // Add custom visibility logic for sport fun theme
    if (isset($widget['classname']) && strpos($widget['classname'], 'sport-fun') !== false) {
        return true;
    }
    return $display;
}
add_filter('widget_display_callback', 'billiardtoday_sport_fun_widget_visibility_display', 10, 2);

/**
 * Add support for the Publicize.
 *
 * @param array $post_data Publicize post data.
 * @param int $post_id Post ID.
 * @return array Modified Publicize post data.
 */
function billiardtoday_sport_fun_publicize_post_data($post_data, $post_id) {
    $post_data['title'] = get_the_title($post_id) . ' - BilliardToday Sport Fun';
    $post_data['description'] = 'Fun and playful billiard tournament platform';
    return $post_data;
}
add_filter('jetpack_publicize_post_data', 'billiardtoday_sport_fun_publicize_post_data', 10, 2);

/**
 * Add support for the Sharing.
 *
 * @param array $services Sharing services.
 * @return array Modified Sharing services.
 */
function billiardtoday_sport_fun_sharing_services($services) {
    // Add sport fun theme styling to sharing buttons
    $services['style'] = 'icon';
    $services['label'] = false;
    return $services;
}
add_filter('jetpack_sharing_services', 'billiardtoday_sport_fun_sharing_services');

/**
 * Add support for the Likes.
 *
 * @param bool $enabled Whether Likes are enabled.
 * @return bool Modified Likes enabled status.
 */
function billiardtoday_sport_fun_likes_enabled($enabled) {
    // Enable likes with sport fun theme styling
    return $enabled;
}
add_filter('jetpack_likes_enabled', 'billiardtoday_sport_fun_likes_enabled');

/**
 * Add support for the Subscriptions.
 *
 * @param bool $enabled Whether Subscriptions are enabled.
 * @return bool Modified Subscriptions enabled status.
 */
function billiardtoday_sport_fun_subscriptions_enabled($enabled) {
    // Enable subscriptions with sport fun theme styling
    return $enabled;
}
add_filter('jetpack_subscriptions_enabled', 'billiardtoday_sport_fun_subscriptions_enabled');

/**
 * Add support for the Markdown.
 *
 * @param array $args Markdown arguments.
 * @return array Modified Markdown arguments.
 */
function billiardtoday_sport_fun_markdown_args($args) {
    $args['id'] = 'billiardtoday-sport-fun-markdown';
    return $args;
}
add_filter('wp_markdown_args', 'billiardtoday_sport_fun_markdown_args');

/**
 * Add support for the Contact Form.
 *
 * @param array $fields Contact Form fields.
 * @return array Modified Contact Form fields.
 */
function billiardtoday_sport_fun_contact_form_fields($fields) {
    // Add sport fun theme styling to contact form fields
    $fields['submit_class'] = 'btn btn-primary sport-fun-submit';
    return $fields;
}
add_filter('jetpack_contact_form_fields', 'billiardtoday_sport_fun_contact_form_fields');

/**
 * Add support for the Shortcodes.
 *
 * @param array $shortcodes Shortcodes.
 * @return array Modified Shortcodes.
 */
function billiardtoday_sport_fun_shortcodes($shortcodes) {
    // Add sport fun theme specific shortcodes
    $shortcodes['sport_fun_card'] = 'billiardtoday_sport_fun_card_shortcode';
    $shortcodes['sport_fun_stats'] = 'billiardtoday_sport_fun_stats_shortcode';
    $shortcodes['sport_fun_game'] = 'billiardtoday_sport_fun_game_shortcode';
    return $shortcodes;
}
add_filter('jetpack_shortcodes', 'billiardtoday_sport_fun_shortcodes');

/**
 * Custom shortcode for sport fun cards
 */
function billiardtoday_sport_fun_card_shortcode($atts, $content = '') {
    $atts = shortcode_atts(array(
        'title' => '',
        'icon' => '',
        'type' => 'default',
    ), $atts, 'sport_fun_card');

    $type_classes = array(
        'default' => 'sport-fun-card-default',
        'primary' => 'sport-fun-card-primary',
        'secondary' => 'sport-fun-card-secondary',
        'gaming' => 'sport-fun-card-gaming',
    );

    $type_class = isset($type_classes[$atts['type']]) ? $type_classes[$atts['type']] : $type_classes['default'];

    $output = '<div class="sport-fun-card ' . esc_attr($type_class) . '">';
    
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
 * Custom shortcode for sport fun stats
 */
function billiardtoday_sport_fun_stats_shortcode($atts) {
    $atts = shortcode_atts(array(
        'players' => '1000+',
        'events' => '500+',
        'matches' => '25K+',
        'fun_factor' => '99%',
    ), $atts, 'sport_fun_stats');

    $output = '<div class="sport-fun-stats-grid">';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['players']) . '</span><span class="stat-label">' . __('Fun Players', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['events']) . '</span><span class="stat-label">' . __('Gaming Events', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['matches']) . '</span><span class="stat-label">' . __('Awesome Matches', 'billiardtoday') . '</span></div>';
    $output .= '<div class="stat-item"><span class="stat-number">' . esc_html($atts['fun_factor']) . '</span><span class="stat-label">' . __('Fun Factor', 'billiardtoday') . '</span></div>';
    $output .= '</div>';

    return $output;
}

/**
 * Custom shortcode for sport fun games
 */
function billiardtoday_sport_fun_game_shortcode($atts) {
    $atts = shortcode_atts(array(
        'name' => '',
        'difficulty' => 'medium',
        'players' => '2-4',
        'type' => 'tournament',
    ), $atts, 'sport_fun_game');

    $difficulty_colors = array(
        'easy' => '#06ffa5',
        'medium' => '#ffd166',
        'hard' => '#ff6b35',
        'expert' => '#ff006e',
    );

    $color = isset($difficulty_colors[$atts['difficulty']]) ? $difficulty_colors[$atts['difficulty']] : '#ffd166';

    $output = '<div class="sport-fun-game-card">';
    $output .= '<div class="game-header" style="background: linear-gradient(135deg, ' . $color . ' 0%, var(--primary-orange) 100%);">';
    $output .= '<h4 class="game-title">' . esc_html($atts['name']) . '</h4>';
    $output .= '<span class="game-difficulty" style="background: ' . $color . ';">' . esc_html(ucfirst($atts['difficulty'])) . '</span>';
    $output .= '</div>';
    $output .= '<div class="game-details">';
    $output .= '<div class="game-info"><span class="info-label">🎮 Players:</span> <span class="info-value">' . esc_html($atts['players']) . '</span></div>';
    $output .= '<div class="game-info"><span class="info-label">🎯 Type:</span> <span class="info-value">' . esc_html(ucfirst($atts['type'])) . '</span></div>';
    $output .= '</div>';
    $output .= '</div>';

    return $output;
}

/**
 * Add support for the Widgets.
 *
 * @param array $widgets Widgets.
 * @return array Modified Widgets.
 */
function billiardtoday_sport_fun_widgets($widgets) {
    // Add sport fun theme specific widgets
    $widgets['sport_fun_stats'] = 'BilliardToday_Sport_Fun_Stats_Widget';
    $widgets['sport_fun_games'] = 'BilliardToday_Sport_Fun_Games_Widget';
    return $widgets;
}
add_filter('jetpack_widgets', 'billiardtoday_sport_fun_widgets');

/**
 * Sport Fun Stats Widget
 */
class BilliardToday_Sport_Fun_Stats_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'sport_fun_stats',
            __('Sport Fun Stats', 'billiardtoday'),
            array('description' => __('Display fun gaming statistics in playful style', 'billiardtoday'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        echo '<div class="sport-fun-stats-widget">';
        echo '<h3 class="widget-title">' . esc_html($instance['title']) . '</h3>';
        echo '<div class="stats-content">';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['players']) . '</span><span class="stat-label">' . __('Players', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['events']) . '</span><span class="stat-label">' . __('Events', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['matches']) . '</span><span class="stat-label">' . __('Matches', 'billiardtoday') . '</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . esc_html($instance['fun_factor']) . '</span><span class="stat-label">' . __('Fun Factor', 'billiardtoday') . '</span></div>';
        echo '</div>';
        echo '</div>';
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Sport Fun Statistics', 'billiardtoday');
        $players = !empty($instance['players']) ? $instance['players'] : '1000+';
        $events = !empty($instance['events']) ? $instance['events'] : '500+';
        $matches = !empty($instance['matches']) ? $instance['matches'] : '25K+';
        $fun_factor = !empty($instance['fun_factor']) ? $instance['fun_factor'] : '99%';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('players'); ?>"><?php _e('Players:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('players'); ?>" name="<?php echo $this->get_field_name('players'); ?>" type="text" value="<?php echo esc_attr($players); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('events'); ?>"><?php _e('Events:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('events'); ?>" name="<?php echo $this->get_field_name('events'); ?>" type="text" value="<?php echo esc_attr($events); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('matches'); ?>"><?php _e('Matches:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('matches'); ?>" name="<?php echo $this->get_field_name('matches'); ?>" type="text" value="<?php echo esc_attr($matches); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('fun_factor'); ?>"><?php _e('Fun Factor:', 'billiardtoday'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('fun_factor'); ?>" name="<?php echo $this->get_field_name('fun_factor'); ?>" type="text" value="<?php echo esc_attr($fun_factor); ?>">
        </p>
        <?php
    }
}

/**
 * Sport Fun Games Widget
 */
class BilliardToday_Sport_Fun_Games_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'sport_fun_games',
            __('Sport Fun Games', 'billiardtoday'),
            array('description' => __('Display featured fun games', 'billiardtoday'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        echo '<div class="sport-fun-games-widget">';
        echo '<h3 class="widget-title">' . esc_html($instance['title']) . '</h3>';
        echo '<div class="games-content">';
        
        // Display game cards
        $games = array(
            array('name' => 'Speed Pool', 'difficulty' => 'easy', 'players' => '1-2'),
            array('name' => 'Tournament Mode', 'difficulty' => 'medium', 'players' => '2-8'),
            array('name' => 'Challenge Mode', 'difficulty' => 'hard', 'players' => '2-4'),
        );
        
        foreach ($games as $game) {
            echo '<div class="game-item">';
            echo '<div class="game-icon">🎮</div>';
            echo '<div class="game-info">';
            echo '<div class="game-name">' . esc_html($game['name']) . '</div>';
            echo '<div class="game-meta">' . esc_html($game['players']) . ' players • ' . esc_html($game['difficulty']) . '</div>';
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        echo '</div>';
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Featured Games', 'billiardtoday');
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
function billiardtoday_sport_fun_custom_css($css) {
    // Add sport fun specific CSS
    $sport_fun_css = '
        /* Sport Fun Jetpack Styles */
        .jetpack-widget-social-icons ul li a {
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
            border-radius: 50px;
            color: white;
        }
        
        .jetpack-widget-social-icons ul li a:hover {
            transform: translateY(-2px) scale(1.1);
            box-shadow: 0 8px 32px rgba(255, 107, 53, 0.4);
        }
        
        .sport-fun-stats-widget {
            background: #ffffff;
            border: 2px solid #e5e5e5;
            border-radius: 20px;
            padding: 20px;
        }
        
        .sport-fun-stats-widget .widget-title {
            color: #171717;
            margin-bottom: 15px;
            font-family: "Fredoka One", cursive;
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
            font-weight: 900;
            color: #ff6b35;
            font-family: "Fredoka One", cursive;
        }
        
        .stat-label {
            display: block;
            font-size: 12px;
            color: #404040;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .sport-fun-games-widget {
            background: #ffffff;
            border: 2px solid #e5e5e5;
            border-radius: 20px;
            padding: 20px;
        }
        
        .game-item {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 2px solid #f5f5f5;
            transition: all 0.2s ease;
        }
        
        .game-item:hover {
            background: rgba(255, 107, 53, 0.1);
            border-radius: 15px;
            padding-left: 10px;
            padding-right: 10px;
        }
        
        .game-item:last-child {
            border-bottom: none;
        }
        
        .game-icon {
            font-size: 24px;
            margin-right: 15px;
        }
        
        .game-name {
            font-weight: 700;
            color: #171717;
            font-family: "Fredoka One", cursive;
        }
        
        .game-meta {
            font-size: 12px;
            color: #404040;
            font-weight: 600;
        }
        
        .sport-fun-card {
            background: #ffffff;
            border: 2px solid #e5e5e5;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .sport-fun-card.sport-fun-card-primary {
            background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        }
        
        .sport-fun-card.sport-fun-card-secondary {
            background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
        }
        
        .sport-fun-card.sport-fun-card-gaming {
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
            color: white;
        }
        
        .card-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #ff6b35;
        }
        
        .card-title {
            color: #171717;
            margin-bottom: 10px;
            font-family: "Fredoka One", cursive;
        }
        
        .card-content {
            color: #404040;
        }
        
        .sport-fun-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .sport-fun-game-card {
            background: #ffffff;
            border: 2px solid #e5e5e5;
            border-radius: 20px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        
        .game-header {
            padding: 20px;
            color: white;
            text-align: center;
        }
        
        .game-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
            font-family: "Fredoka One", cursive;
        }
        
        .game-difficulty {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .game-details {
            padding: 20px;
        }
        
        .game-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .info-label {
            font-weight: 600;
            color: #404040;
        }
        
        .info-value {
            font-weight: 700;
            color: #171717;
        }
    ';
    
    return $css . $sport_fun_css;
}
add_filter('jetpack_custom_css', 'billiardtoday_sport_fun_custom_css');

/**
 * Add support for the Analytics.
 *
 * @param array $options Analytics options.
 * @return array Modified Analytics options.
 */
function billiardtoday_sport_fun_analytics_options($options) {
    $options['track_sport_fun'] = true;
    return $options;
}
add_filter('jetpack_analytics_options', 'billiardtoday_sport_fun_analytics_options');

/**
 * Add sport fun Jetpack customizations
 */
function billiardtoday_sport_fun_jetpack_customizations() {
    // Remove unnecessary Jetpack features for sport fun theme
    add_filter('jetpack_implode_frontend_css', '__return_false');
    
    // Optimize Jetpack for sport fun design
    add_filter('jetpack_open_graph_tags', function($tags) {
        $tags['og:title'] = get_bloginfo('name') . ' - Sport Fun Theme';
        $tags['og:description'] = 'Fun and playful billiard tournament platform';
        $tags['og:image'] = get_template_directory_uri() . '/assets/sport-fun-og.jpg';
        return $tags;
    });
    
    // Add sport fun Jetpack CSS
    wp_add_inline_style('jetpack_css', '
        .jetpack-infinite-scroll-loader {
            background: #ffffff;
            border: 2px solid #e5e5e5;
            border-radius: 20px;
            color: #ff6b35;
            font-family: "Fredoka One", cursive;
        }
        
        .infinite-loader .spinner {
            border-top-color: #ff6b35;
        }
        
        .jetpack-carousel-wrapper {
            background: #ffffff;
        }
        
        .jetpack-carousel-caption {
            background: rgba(255, 255, 255, 0.95);
            color: #171717;
            border-radius: 20px;
        }
        
        .jp-carousel-slide-selected img {
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
        }
    ');
}
add_action('init', 'billiardtoday_sport_fun_jetpack_customizations');
?>
