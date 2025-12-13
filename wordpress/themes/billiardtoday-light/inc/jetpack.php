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
function billiardtoday_light_jetpack_setup() {
    // Add theme support for Infinite Scroll.
    add_theme_support(
        'infinite-scroll',
        array(
            'container' => 'main',
            'render'    => 'billiardtoday_light_infinite_scroll_render',
            'footer'    => 'page',
        )
    );

    // Add theme support for Responsive Videos.
    add_theme_support('jetpack-responsive-videos');

    // Add theme support for Content Options.
    add_theme_support(
        'jetpack-content-options',
        array(
            'post-details' => array(
                'stylesheet' => 'billiardtoday-light-style',
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
add_action('after_setup_theme', 'billiardtoday_light_jetpack_setup');

/**
 * Custom render function for Infinite Scroll.
 */
function billiardtoday_light_infinite_scroll_render() {
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
function billiardtoday_light_site_logo_args($args) {
    $args['size'] = 'medium';
    return $args;
}
add_filter('jetpack_site_logo_args', 'billiardtoday_light_site_logo_args');

/**
 * Add support for the Social Menu.
 *
 * @param array $args Social Menu arguments.
 * @return array Modified Social Menu arguments.
 */
function billiardtoday_light_social_menu_args($args) {
    $args['menu_class'] = 'social-links-menu';
    return $args;
}
add_filter('jetpack_social_menu_args', 'billiardtoday_light_social_menu_args');

/**
 * Add support for the Related Posts.
 *
 * @param array $options Related Posts options.
 * @return array Modified Related Posts options.
 */
function billiardtoday_light_related_posts_filter($options) {
    $options['show_headline'] = false;
    $options['layout'] = 'grid';
    return $options;
}
add_filter('jetpack_relatedposts_filter_options', 'billiardtoday_light_related_posts_filter');

/**
 * Add support for the Tiled Gallery.
 *
 * @param array $defaults Tiled Gallery defaults.
 * @return array Modified Tiled Gallery defaults.
 */
function billiardtoday_light_tiled_gallery_defaults($defaults) {
    $defaults['type'] = 'rectangular';
    $defaults['link'] = 'post';
    return $defaults;
}
add_filter('jetpack_default_tiled_gallery', 'billiardtoday_light_tiled_gallery_defaults');

/**
 * Add support for the Photon.
 *
 * @param array $args Photon arguments.
 * @return array Modified Photon arguments.
 */
function billiardtoday_light_photon_args($args) {
    $args['exclude'] = array('avatar');
    return $args;
}
add_filter('jetpack_photon_post_image_args', 'billiardtoday_light_photon_args');

/**
 * Add support for the Lazy Images.
 *
 * @param array $attributes Lazy Images attributes.
 * @return array Modified Lazy Images attributes.
 */
function billiardtoday_light_lazy_images_attributes($attributes) {
    $attributes['class'] .= ' lazyload';
    return $attributes;
}
add_filter('jetpack_lazy_images_attributes', 'billiardtoday_light_lazy_images_attributes');

/**
 * Add support for the Carousel.
 *
 * @param array $options Carousel options.
 * @return array Modified Carousel options.
 */
function billiardtoday_light_carousel_options($options) {
    $options['local'] = true;
    $options['width'] = 800;
    $options['height'] = 600;
    return $options;
}
add_filter('jetpack_carousel_options', 'billiardtoday_light_carousel_options');

/**
 * Add support for the Widget Visibility.
 *
 * @param array $display Widget Visibility display rules.
 * @return array Modified Widget Visibility display rules.
 */
function billiardtoday_light_widget_visibility_display($display, $widget) {
    // Add custom visibility logic here
    return $display;
}
add_filter('widget_display_callback', 'billiardtoday_light_widget_visibility_display', 10, 2);

/**
 * Add support for the Publicize.
 *
 * @param array $post_data Publicize post data.
 * @param int $post_id Post ID.
 * @return array Modified Publicize post data.
 */
function billiardtoday_light_publicize_post_data($post_data, $post_id) {
    // Add custom publicize logic here
    return $post_data;
}
add_filter('jetpack_publicize_post_data', 'billiardtoday_light_publicize_post_data', 10, 2);

/**
 * Add support for the Sharing.
 *
 * @param array $services Sharing services.
 * @return array Modified Sharing services.
 */
function billiardtoday_light_sharing_services($services) {
    // Add custom sharing services here
    return $services;
}
add_filter('jetpack_sharing_services', 'billiardtoday_light_sharing_services');

/**
 * Add support for the Likes.
 *
 * @param bool $enabled Whether Likes are enabled.
 * @return bool Modified Likes enabled status.
 */
function billiardtoday_light_likes_enabled($enabled) {
    // Add custom likes logic here
    return $enabled;
}
add_filter('jetpack_likes_enabled', 'billiardtoday_light_likes_enabled');

/**
 * Add support for the Subscriptions.
 *
 * @param bool $enabled Whether Subscriptions are enabled.
 * @return bool Modified Subscriptions enabled status.
 */
function billiardtoday_light_subscriptions_enabled($enabled) {
    // Add custom subscriptions logic here
    return $enabled;
}
add_filter('jetpack_subscriptions_enabled', 'billiardtoday_light_subscriptions_enabled');

/**
 * Add support for the Markdown.
 *
 * @param array $args Markdown arguments.
 * @return array Modified Markdown arguments.
 */
function billiardtoday_light_markdown_args($args) {
    $args['id'] = 'billiardtoday-light-markdown';
    return $args;
}
add_filter('wp_markdown_args', 'billiardtoday_light_markdown_args');

/**
 * Add support for the Contact Form.
 *
 * @param array $fields Contact Form fields.
 * @return array Modified Contact Form fields.
 */
function billiardtoday_light_contact_form_fields($fields) {
    // Add custom contact form fields here
    return $fields;
}
add_filter('jetpack_contact_form_fields', 'billiardtoday_light_contact_form_fields');

/**
 * Add support for the Shortcodes.
 *
 * @param array $shortcodes Shortcodes.
 * @return array Modified Shortcodes.
 */
function billiardtoday_light_shortcodes($shortcodes) {
    // Add custom shortcodes here
    return $shortcodes;
}
add_filter('jetpack_shortcodes', 'billiardtoday_light_shortcodes');

/**
 * Add support for the Widgets.
 *
 * @param array $widgets Widgets.
 * @return array Modified Widgets.
 */
function billiardtoday_light_widgets($widgets) {
    // Add custom widgets here
    return $widgets;
}
add_filter('jetpack_widgets', 'billiardtoday_light_widgets');

/**
 * Add support for the Custom CSS.
 *
 * @param string $css Custom CSS.
 * @return string Modified Custom CSS.
 */
function billiardtoday_light_custom_css($css) {
    // Add custom CSS here
    return $css;
}
add_filter('jetpack_custom_css', 'billiardtoday_light_custom_css');

/**
 * Add support for the Analytics.
 *
 * @param array $options Analytics options.
 * @return array Modified Analytics options.
 */
function billiardtoday_light_analytics_options($options) {
    // Add custom analytics options here
    return $options;
}
add_filter('jetpack_analytics_options', 'billiardtoday_light_analytics_options');
?>
