<?php
/**
 * Functions which enhance the theme by hooking into WordPress
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Adds custom classes to the array of body classes.
 *
 * @param array $classes Classes for the body element.
 * @return array
 */
function billiardtoday_new_body_classes($classes) {
    // Adds a class of hfeed to non-singular pages.
    if (!is_singular()) {
        $classes[] = 'hfeed';
    }

    // Adds a class of no-sidebar when there is no sidebar present.
    if (!is_active_sidebar('sidebar-1')) {
        $classes[] = 'no-sidebar';
    }

    // Add theme-specific classes
    $classes[] = 'billiardtoday-theme';
    $classes[] = 'billiardtoday-new';

    return $classes;
}
add_filter('body_class', 'billiardtoday_new_body_classes');

/**
 * Add a pingback url auto-discovery header for single posts, pages, or attachments.
 */
function billiardtoday_new_pingback_header() {
    if (is_singular() && pings_open()) {
        printf('<link rel="pingback" href="%s">', esc_url(get_bloginfo('pingback_url')));
    }
}
add_action('wp_head', 'billiardtoday_new_pingback_header');

/**
 * Change the excerpt more string.
 */
function billiardtoday_new_excerpt_more($more) {
    return sprintf(
        ' <a class="read-more" href="%1$s">%2$s</a>',
        esc_url(get_permalink(get_the_ID())),
        sprintf(
            /* translators: %s: Name of current post. Only visible to screen readers */
            __('Continue reading<span class="screen-reader-text"> "%s"</span>', 'billiardtoday'),
            get_the_title()
        )
    );
}
add_filter('excerpt_more', 'billiardtoday_new_excerpt_more');

/**
 * Custom comment callback.
 */
function billiardtoday_new_comment($comment, $args, $depth) {
    if ('div' === $args['style']) {
        $tag       = 'div';
        $add_below = 'comment';
    } else {
        $tag       = 'li';
        $add_below = 'div-comment';
    }
    ?>
    <<?php echo $tag; ?> <?php comment_class(empty($args['has_children']) ? '' : 'parent'); ?> id="comment-<?php comment_ID(); ?>">
    <?php if ('div' !== $args['style']) : ?>
    <div id="div-comment-<?php comment_ID(); ?>" class="comment-body">
    <?php endif; ?>
    <footer class="comment-meta">
        <div class="comment-author vcard">
            <?php if (0 != $args['avatar_size']) echo get_avatar($comment, $args['avatar_size']); ?>
            <?php
            /* translators: %s: comment author link */
            printf(
                __( '%s <span class="says">says:</span>', 'billiardtoday' ),
                sprintf( '<b class="fn">%s</b>', get_comment_author_link() )
            );
            ?>
        </div><!-- .comment-author -->

        <div class="comment-metadata">
            <a href="<?php echo htmlspecialchars( get_comment_link( $comment->comment_ID ) ); ?>">
                <time datetime="<?php comment_time('c'); ?>">
                    <?php
                    /* translators: 1: date, 2: time */
                    printf( __( '%1$s at %2$s', 'billiardtoday' ), get_comment_date(), get_comment_time() );
                    ?>
                </time>
            </a>
            <?php edit_comment_link( __( '(Edit)', 'billiardtoday' ), ' <span class="edit-link">', '</span>' ); ?>
        </div><!-- .comment-metadata -->

        <?php if ('0' == $comment->comment_approved) : ?>
        <p class="comment-awaiting-moderation"><?php _e('Your comment is awaiting moderation.', 'billiardtoday'); ?></p>
        <?php endif; ?>
    </footer><!-- .comment-meta -->

    <div class="comment-content">
        <?php comment_text(); ?>
    </div><!-- .comment-content -->

    <div class="reply">
        <?php
        comment_reply_link(
            array_merge(
                $args,
                array(
                    'add_below' => $add_below,
                    'depth'     => $depth,
                    'max_depth' => $args['max_depth'],
                    'before'    => '<div class="reply">',
                    'after'     => '</div>'
                )
            )
        );
        ?>
    </div><!-- .reply -->
    <?php if ('div' !== $args['style']) : ?>
    </div><!-- .comment-body -->
    <?php endif; ?>
    <?php
}

/**
 * Add customizer styles to head
 */
function billiardtoday_new_customizer_styles() {
    $primary_color = get_theme_mod('primary_color', '#8b5cf6');
    $secondary_color = get_theme_mod('secondary_color', '#ec4899');
    $accent_color = get_theme_mod('accent_color', '#06b6d4');
    
    ob_start();
    ?>
    <style type="text/css">
        :root {
            --primary-color: <?php echo esc_attr($primary_color); ?>;
            --secondary-color: <?php echo esc_attr($secondary_color); ?>;
            --accent-color: <?php echo esc_attr($accent_color); ?>;
        }
        
        .btn-primary,
        .nav-cta {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_color); ?> 0%, <?php echo esc_attr($secondary_color); ?> 100%);
        }
        
        .feature-icon:hover,
        .stat-icon:hover {
            background: linear-gradient(135deg, <?php echo esc_attr($accent_color); ?> 0%, <?php echo esc_attr($primary_color); ?> 100%);
        }
    </style>
    <?php
    echo ob_get_clean();
}
add_action('wp_head', 'billiardtoday_new_customizer_styles');

/**
 * Add theme support for selective refresh for Customizer
 */
function billiardtoday_new_customize_partial_blogname() {
    bloginfo('name');
}
add_action('customize_partial_blogname', 'billiardtoday_new_customize_partial_blogname');

function billiardtoday_new_customize_partial_blogdescription() {
    bloginfo('description');
}
add_action('customize_partial_blogdescription', 'billiardtoday_new_customize_partial_blogdescription');

/**
 * Add WooCommerce support if WooCommerce is active
 */
if (class_exists('WooCommerce')) {
    function billiardtoday_new_woocommerce_setup() {
        add_theme_support('woocommerce');
        add_theme_support('wc-product-gallery-zoom');
        add_theme_support('wc-product-gallery-lightbox');
        add_theme_support('wc-product-gallery-slider');
    }
    add_action('after_setup_theme', 'billiardtoday_new_woocommerce_setup');
}

/**
 * Add custom page templates
 */
function billiardtoday_new_add_page_templates($templates) {
    $templates['page-templates/full-width.php'] = __('Full Width', 'billiardtoday');
    $templates['page-templates/landing-page.php'] = __('Landing Page', 'billiardtoday');
    return $templates;
}
add_filter('theme_page_templates', 'billiardtoday_new_add_page_templates');

/**
 * Load custom page templates
 */
function billiardtoday_new_load_page_template($template) {
    global $post;
    
    if ($post) {
        $page_template = get_post_meta($post->ID, '_wp_page_template', true);
        
        if ($page_template) {
            $template = get_stylesheet_directory() . '/' . $page_template;
        }
    }
    
    return $template;
}
add_filter('template_include', 'billiardtoday_new_load_page_template');

/**
 * Add custom post types
 */
function billiardtoday_new_custom_post_types() {
    // Tournaments Post Type
    register_post_type('tournaments', array(
        'label' => __('Tournaments', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-trophy',
        'show_in_rest' => true,
    ));
    
    // Players Post Type
    register_post_type('players', array(
        'label' => __('Players', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-groups',
        'show_in_rest' => true,
    ));
}
add_action('init', 'billiardtoday_new_custom_post_types');

/**
 * Add custom taxonomies
 */
function billiardtoday_new_custom_taxonomies() {
    // Tournament Categories
    register_taxonomy('tournament_category', 'tournaments', array(
        'label' => __('Categories', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
    
    // Player Rankings
    register_taxonomy('player_ranking', 'players', array(
        'label' => __('Rankings', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
}
add_action('init', 'billiardtoday_new_custom_taxonomies');

/**
 * Add meta boxes
 */
function billiardtoday_new_add_meta_boxes() {
    add_meta_box(
        'tournament_details',
        __('Tournament Details', 'billiardtoday'),
        'billiardtoday_new_tournament_details_callback',
        'tournaments',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'billiardtoday_new_add_meta_boxes');

function billiardtoday_new_tournament_details_callback($post) {
    wp_nonce_field('billiardtoday_new_save_tournament_details', 'tournament_details_nonce');
    
    $start_date = get_post_meta($post->ID, '_start_date', true);
    $end_date = get_post_meta($post->ID, '_end_date', true);
    $location = get_post_meta($post->ID, '_location', true);
    
    echo '<label for="start_date">' . __('Start Date:', 'billiardtoday') . '</label>';
    echo '<input type="date" id="start_date" name="start_date" value="' . esc_attr($start_date) . '" style="width: 100%; margin-bottom: 10px;">';
    
    echo '<label for="end_date">' . __('End Date:', 'billiardtoday') . '</label>';
    echo '<input type="date" id="end_date" name="end_date" value="' . esc_attr($end_date) . '" style="width: 100%; margin-bottom: 10px;">';
    
    echo '<label for="location">' . __('Location:', 'billiardtoday') . '</label>';
    echo '<input type="text" id="location" name="location" value="' . esc_attr($location) . '" style="width: 100%;">';
}

function billiardtoday_new_save_tournament_details($post_id) {
    if (!isset($_POST['tournament_details_nonce']) || !wp_verify_nonce($_POST['tournament_details_nonce'], 'billiardtoday_new_save_tournament_details')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (isset($_POST['start_date'])) {
        update_post_meta($post_id, '_start_date', sanitize_text_field($_POST['start_date']));
    }
    
    if (isset($_POST['end_date'])) {
        update_post_meta($post_id, '_end_date', sanitize_text_field($_POST['end_date']));
    }
    
    if (isset($_POST['location'])) {
        update_post_meta($post_id, '_location', sanitize_text_field($_POST['location']));
    }
}
add_action('save_post', 'billiardtoday_new_save_tournament_details');
?>
