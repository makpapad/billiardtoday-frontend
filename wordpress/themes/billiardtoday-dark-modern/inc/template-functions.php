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
function billiardtoday_dark_modern_body_classes($classes) {
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
    $classes[] = 'billiardtoday-dark-modern';
    $classes[] = 'dark-theme';
    $classes[] = 'modern-theme';

    return $classes;
}
add_filter('body_class', 'billiardtoday_dark_modern_body_classes');

/**
 * Add a pingback url auto-discovery header for single posts, pages, or attachments.
 */
function billiardtoday_dark_modern_pingback_header() {
    if (is_singular() && pings_open()) {
        printf('<link rel="pingback" href="%s">', esc_url(get_bloginfo('pingback_url')));
    }
}
add_action('wp_head', 'billiardtoday_dark_modern_pingback_header');

/**
 * Change the excerpt more string.
 */
function billiardtoday_dark_modern_excerpt_more($more) {
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
add_filter('excerpt_more', 'billiardtoday_dark_modern_excerpt_more');

/**
 * Custom comment callback.
 */
function billiardtoday_dark_modern_comment($comment, $args, $depth) {
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
function billiardtoday_dark_modern_customizer_styles() {
    $primary_accent = get_theme_mod('primary_accent', '#00d4ff');
    $secondary_accent = get_theme_mod('secondary_accent', '#ff006e');
    $bg_primary = get_theme_mod('bg_primary_dark', '#0a0a0a');
    $bg_secondary = get_theme_mod('bg_secondary_dark', '#1a1a1a');
    $text_primary = get_theme_mod('text_primary_dark', '#ffffff');
    $text_muted = get_theme_mod('text_muted_dark', '#a0a0a0');
    
    ob_start();
    ?>
    <style type="text/css">
        :root {
            --primary-accent: <?php echo esc_attr($primary_accent); ?>;
            --secondary-accent: <?php echo esc_attr($secondary_accent); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-muted: <?php echo esc_attr($text_muted); ?>;
        }
        
        .btn-primary,
        .nav-cta {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_accent); ?> 0%, <?php echo esc_attr($secondary_accent); ?> 100%);
        }
        
        .btn-secondary {
            border-color: <?php echo esc_attr($primary_accent); ?>;
            color: <?php echo esc_attr($primary_accent); ?>;
        }
        
        .btn-secondary:hover {
            background: <?php echo esc_attr($primary_accent); ?>;
            color: <?php echo esc_attr($bg_primary); ?>;
        }
        
        .logo-icon {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_accent); ?> 0%, <?php echo esc_attr($secondary_accent); ?> 100%);
        }
        
        .social-link:hover {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_accent); ?> 0%, <?php echo esc_attr($secondary_accent); ?> 100%);
            border-color: <?php echo esc_attr($primary_accent); ?>;
        }
        
        .feature-icon {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_accent); ?> 0%, <?php echo esc_attr($secondary_accent); ?> 100%);
        }
        
        .hero-title {
            background: linear-gradient(135deg, <?php echo esc_attr($text_primary); ?> 0%, <?php echo esc_attr($primary_accent); ?> 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .section-title {
            background: linear-gradient(135deg, <?php echo esc_attr($text_primary); ?> 0%, <?php echo esc_attr($primary_accent); ?> 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .feature-icon:hover,
        .stat-icon:hover {
            box-shadow: 0 0 30px rgba(<?php echo hex2rgb($primary_accent); ?>, 0.7);
        }
    </style>
    <?php
    echo ob_get_clean();
}
add_action('wp_head', 'billiardtoday_dark_modern_customizer_styles');

/**
 * Add theme support for selective refresh for Customizer
 */
function billiardtoday_dark_modern_customize_partial_blogname() {
    bloginfo('name');
}
add_action('customize_partial_blogname', 'billiardtoday_dark_modern_customize_partial_blogname');

function billiardtoday_dark_modern_customize_partial_blogdescription() {
    bloginfo('description');
}
add_action('customize_partial_blogdescription', 'billiardtoday_dark_modern_customize_partial_blogdescription');

/**
 * Add WooCommerce support if WooCommerce is active
 */
if (class_exists('WooCommerce')) {
    function billiardtoday_dark_modern_woocommerce_setup() {
        add_theme_support('woocommerce');
        add_theme_support('wc-product-gallery-zoom');
        add_theme_support('wc-product-gallery-lightbox');
        add_theme_support('wc-product-gallery-slider');
        
        // Add dark mode support for WooCommerce
        add_theme_support('woocommerce', array(
            'thumbnail_image_width' => 300,
            'single_image_width'    => 600,
            'product_grid'          => array(
                'default_columns' => 3,
                'min_columns'     => 1,
                'max_columns'     => 4,
            ),
        ));
    }
    add_action('after_setup_theme', 'billiardtoday_dark_modern_woocommerce_setup');
    
    // Add dark mode styles for WooCommerce
    function billiardtoday_dark_modern_woocommerce_styles() {
        ?>
        <style>
            .woocommerce {
                color: var(--text-muted);
            }
            
            .woocommerce a {
                color: var(--primary-accent);
            }
            
            .woocommerce button,
            .woocommerce input.button,
            .woocommerce a.button {
                background: linear-gradient(135deg, var(--primary-accent) 0%, var(--secondary-accent) 100%);
                color: white;
                border: none;
            }
            
            .woocommerce .woocommerce-message,
            .woocommerce .woocommerce-info {
                background: rgba(0, 212, 255, 0.1);
                border-color: var(--primary-accent);
                color: var(--text-primary);
            }
            
            .woocommerce .woocommerce-error {
                background: rgba(255, 0, 110, 0.1);
                border-color: var(--secondary-accent);
                color: var(--text-primary);
            }
        </style>
        <?php
    }
    add_action('wp_head', 'billiardtoday_dark_modern_woocommerce_styles');
}

/**
 * Add custom page templates
 */
function billiardtoday_dark_modern_add_page_templates($templates) {
    $templates['page-templates/full-width.php'] = __('Full Width', 'billiardtoday');
    $templates['page-templates/landing-page.php'] = __('Landing Page', 'billiardtoday');
    $templates['page-templates/dark-modern.php'] = __('Dark Modern Layout', 'billiardtoday');
    return $templates;
}
add_filter('theme_page_templates', 'billiardtoday_dark_modern_add_page_templates');

/**
 * Load custom page templates
 */
function billiardtoday_dark_modern_load_page_template($template) {
    global $post;
    
    if ($post) {
        $page_template = get_post_meta($post->ID, '_wp_page_template', true);
        
        if ($page_template) {
            $template = get_stylesheet_directory() . '/' . $page_template;
        }
    }
    
    return $template;
}
add_filter('template_include', 'billiardtoday_dark_modern_load_page_template');

/**
 * Add custom post types
 */
function billiardtoday_dark_modern_custom_post_types() {
    // Tournaments Post Type
    register_post_type('tournaments', array(
        'label' => __('Tournaments', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-trophy',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
    
    // Players Post Type
    register_post_type('players', array(
        'label' => __('Players', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-groups',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
}
add_action('init', 'billiardtoday_dark_modern_custom_post_types');

/**
 * Add custom taxonomies
 */
function billiardtoday_dark_modern_custom_taxonomies() {
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
add_action('init', 'billiardtoday_dark_modern_custom_taxonomies');

/**
 * Add meta boxes
 */
function billiardtoday_dark_modern_add_meta_boxes() {
    add_meta_box(
        'tournament_details',
        __('Tournament Details', 'billiardtoday'),
        'billiardtoday_dark_modern_tournament_details_callback',
        'tournaments',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'billiardtoday_dark_modern_add_meta_boxes');

function billiardtoday_dark_modern_tournament_details_callback($post) {
    wp_nonce_field('billiardtoday_dark_modern_save_tournament_details', 'tournament_details_nonce');
    
    $start_date = get_post_meta($post->ID, '_start_date', true);
    $end_date = get_post_meta($post->ID, '_end_date', true);
    $location = get_post_meta($post->ID, '_location', true);
    $prize_pool = get_post_meta($post->ID, '_prize_pool', true);
    
    ?>
    <div style="background: #1e1e1e; padding: 20px; border-radius: 8px; border: 1px solid #2a2a2a;">
        <div style="margin-bottom: 15px;">
            <label for="start_date" style="display: block; margin-bottom: 5px; color: #ffffff; font-weight: 600;"><?php _e('Start Date:', 'billiardtoday'); ?></label>
            <input type="date" id="start_date" name="start_date" value="<?php echo esc_attr($start_date); ?>" style="width: 100%; padding: 10px; background: #2d2d2d; border: 1px solid #2a2a2a; border-radius: 4px; color: #ffffff;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="end_date" style="display: block; margin-bottom: 5px; color: #ffffff; font-weight: 600;"><?php _e('End Date:', 'billiardtoday'); ?></label>
            <input type="date" id="end_date" name="end_date" value="<?php echo esc_attr($end_date); ?>" style="width: 100%; padding: 10px; background: #2d2d2d; border: 1px solid #2a2a2a; border-radius: 4px; color: #ffffff;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="location" style="display: block; margin-bottom: 5px; color: #ffffff; font-weight: 600;"><?php _e('Location:', 'billiardtoday'); ?></label>
            <input type="text" id="location" name="location" value="<?php echo esc_attr($location); ?>" style="width: 100%; padding: 10px; background: #2d2d2d; border: 1px solid #2a2a2a; border-radius: 4px; color: #ffffff;">
        </div>
        
        <div>
            <label for="prize_pool" style="display: block; margin-bottom: 5px; color: #ffffff; font-weight: 600;"><?php _e('Prize Pool:', 'billiardtoday'); ?></label>
            <input type="text" id="prize_pool" name="prize_pool" value="<?php echo esc_attr($prize_pool); ?>" style="width: 100%; padding: 10px; background: #2d2d2d; border: 1px solid #2a2a2a; border-radius: 4px; color: #ffffff;">
        </div>
    </div>
    <?php
}

function billiardtoday_dark_modern_save_tournament_details($post_id) {
    if (!isset($_POST['tournament_details_nonce']) || !wp_verify_nonce($_POST['tournament_details_nonce'], 'billiardtoday_dark_modern_save_tournament_details')) {
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
    
    if (isset($_POST['prize_pool'])) {
        update_post_meta($post_id, '_prize_pool', sanitize_text_field($_POST['prize_pool']));
    }
}
add_action('save_post', 'billiardtoday_dark_modern_save_tournament_details');

/**
 * Add dark modern specific CSS optimizations
 */
function billiardtoday_dark_modern_css_optimizations() {
    // Remove unnecessary CSS
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    
    // Add dark modern critical CSS
    wp_add_inline_style('billiardtoday-dark-modern-style', '
        /* Critical CSS for dark modern theme */
        body{font-family:Inter,sans-serif;background:#0a0a0a;color:#ffffff;line-height:1.6}
        .main-navigation{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(26,26,26,0.95);backdrop-filter:blur(20px);border-bottom:1px solid #2a2a2a}
        .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1a1a 0%,#0a0a0a 100%)}
        .btn-primary{background:linear-gradient(135deg,#00d4ff 0%,#ff006e 100%);color:#fff;padding:1rem 2rem;border-radius:8px;text-decoration:none}
        .feature-card{background:#1e1e1e;padding:2.5rem;border:1px solid #2a2a2a;border-radius:1rem}
        .feature-icon{background:linear-gradient(135deg,#00d4ff 0%,#ff006e 100%);width:4rem;height:4rem;border-radius:1rem;display:flex;align-items:center;justify-content:center;color:#fff}
    ');
}
add_action('wp_enqueue_scripts', 'billiardtoday_dark_modern_css_optimizations', 100);

/**
 * Add dark modern performance optimizations
 */
function billiardtoday_dark_modern_performance_optimizations() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    
    // Remove WordPress version
    remove_action('wp_head', 'wp_generator');
    
    // Remove RSD link
    remove_action('wp_head', 'rsd_link');
    
    // Remove Windows Live Writer manifest link
    remove_action('wp_head', 'wlwmanifest_link');
    
    // Add dark mode meta tag
    echo '<meta name="color-scheme" content="dark">';
    echo '<meta name="theme-color" content="#0a0a0a">';
}
add_action('init', 'billiardtoday_dark_modern_performance_optimizations');

/**
 * Helper function to convert hex to RGB
 */
function hex2rgb($hex) {
    $hex = str_replace("#", "", $hex);
    
    if (strlen($hex) == 3) {
        $r = hexdec(substr($hex,0,1).substr($hex,0,1));
        $g = hexdec(substr($hex,1,1).substr($hex,1,1));
        $b = hexdec(substr($hex,2,1).substr($hex,2,1));
    } else {
        $r = hexdec(substr($hex,0,2));
        $g = hexdec(substr($hex,2,2));
        $b = hexdec(substr($hex,4,2));
    }
    
    return "$r, $g, $b";
}

/**
 * Add dark mode admin styles
 */
function billiardtoday_dark_modern_admin_styles() {
    ?>
    <style>
        .admin-color-dark-modern {
            --primary: #00d4ff;
            --secondary: #ff006e;
            --background: #0a0a0a;
            --surface: #1a1a1a;
            --text: #ffffff;
            --text-muted: #a0a0a0;
        }
    </style>
    <?php
}
add_action('admin_head', 'billiardtoday_dark_modern_admin_styles');
?>
