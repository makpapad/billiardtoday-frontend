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
function billiardtoday_corporate_body_classes($classes) {
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
    $classes[] = 'billiardtoday-corporate';
    $classes[] = 'corporate-theme';
    $classes[] = 'business-theme';

    return $classes;
}
add_filter('body_class', 'billiardtoday_corporate_body_classes');

/**
 * Add a pingback url auto-discovery header for single posts, pages, or attachments.
 */
function billiardtoday_corporate_pingback_header() {
    if (is_singular() && pings_open()) {
        printf('<link rel="pingback" href="%s">', esc_url(get_bloginfo('pingback_url')));
    }
}
add_action('wp_head', 'billiardtoday_corporate_pingback_header');

/**
 * Change the excerpt more string.
 */
function billiardtoday_corporate_excerpt_more($more) {
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
add_filter('excerpt_more', 'billiardtoday_corporate_excerpt_more');

/**
 * Custom comment callback.
 */
function billiardtoday_corporate_comment($comment, $args, $depth) {
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
function billiardtoday_corporate_customizer_styles() {
    $primary_blue = get_theme_mod('primary_blue', '#1e3a8a');
    $secondary_blue = get_theme_mod('secondary_blue', '#3b82f6');
    $accent_blue = get_theme_mod('accent_blue', '#60a5fa');
    $bg_primary = get_theme_mod('bg_primary_corporate', '#ffffff');
    $bg_secondary = get_theme_mod('bg_secondary_corporate', '#f8fafc');
    $text_primary = get_theme_mod('text_primary_corporate', '#1e293b');
    $text_secondary = get_theme_mod('text_secondary_corporate', '#475569');
    $font_family = get_theme_mod('font_family_corporate', 'Inter');
    $font_weight = get_theme_mod('font_weight_corporate', '700');
    
    ob_start();
    ?>
    <style type="text/css">
        :root {
            --primary-blue: <?php echo esc_attr($primary_blue); ?>;
            --secondary-blue: <?php echo esc_attr($secondary_blue); ?>;
            --accent-blue: <?php echo esc_attr($accent_blue); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-secondary: <?php echo esc_attr($text_secondary); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .btn-primary,
        .nav-cta {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_blue); ?> 0%, <?php echo esc_attr($secondary_blue); ?> 100%);
        }
        
        .btn-secondary {
            border-color: <?php echo esc_attr($secondary_blue); ?>;
            color: <?php echo esc_attr($secondary_blue); ?>;
        }
        
        .btn-secondary:hover {
            background: <?php echo esc_attr($secondary_blue); ?>;
            color: white;
        }
        
        .logo-icon {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_blue); ?> 0%, <?php echo esc_attr($secondary_blue); ?> 100%);
        }
        
        .social-link:hover {
            background: <?php echo esc_attr($secondary_blue); ?>;
            border-color: <?php echo esc_attr($secondary_blue); ?>;
        }
        
        .feature-icon {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_blue); ?> 0%, <?php echo esc_attr($secondary_blue); ?> 100%);
        }
        
        .hero-title {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_blue); ?> 0%, <?php echo esc_attr($secondary_blue); ?> 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .stat-number {
            color: <?php echo esc_attr($secondary_blue); ?>;
        }
        
        body {
            font-family: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
    </style>
    <?php
    echo ob_get_clean();
}
add_action('wp_head', 'billiardtoday_corporate_customizer_styles');

/**
 * Add theme support for selective refresh for Customizer
 */
function billiardtoday_corporate_customize_partial_blogname() {
    bloginfo('name');
}
add_action('customize_partial_blogname', 'billiardtoday_corporate_customize_partial_blogname');

function billiardtoday_corporate_customize_partial_blogdescription() {
    bloginfo('description');
}
add_action('customize_partial_blogdescription', 'billiardtoday_corporate_customize_partial_blogdescription');

/**
 * Add WooCommerce support if WooCommerce is active
 */
if (class_exists('WooCommerce')) {
    function billiardtoday_corporate_woocommerce_setup() {
        add_theme_support('woocommerce');
        add_theme_support('wc-product-gallery-zoom');
        add_theme_support('wc-product-gallery-lightbox');
        add_theme_support('wc-product-gallery-slider');
        
        // Add corporate support for WooCommerce
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
    add_action('after_setup_theme', 'billiardtoday_corporate_woocommerce_setup');
    
    // Add corporate styles for WooCommerce
    function billiardtoday_corporate_woocommerce_styles() {
        ?>
        <style>
            .woocommerce {
                color: var(--text-secondary);
            }
            
            .woocommerce a {
                color: var(--secondary-blue);
            }
            
            .woocommerce button,
            .woocommerce input.button,
            .woocommerce a.button {
                background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
                color: white;
                border: none;
            }
            
            .woocommerce .woocommerce-message,
            .woocommerce .woocommerce-info {
                background: rgba(59, 130, 246, 0.1);
                border-color: var(--secondary-blue);
                color: var(--text-primary);
            }
            
            .woocommerce .woocommerce-error {
                background: rgba(239, 68, 68, 0.1);
                border-color: var(--error-red);
                color: var(--text-primary);
            }
        </style>
        <?php
    }
    add_action('wp_head', 'billiardtoday_corporate_woocommerce_styles');
}

/**
 * Add custom page templates
 */
function billiardtoday_corporate_add_page_templates($templates) {
    $templates['page-templates/full-width.php'] = __('Full Width', 'billiardtoday');
    $templates['page-templates/landing-page.php'] = __('Landing Page', 'billiardtoday');
    $templates['page-templates/corporate.php'] = __('Corporate Layout', 'billiardtoday');
    return $templates;
}
add_filter('theme_page_templates', 'billiardtoday_corporate_add_page_templates');

/**
 * Load custom page templates
 */
function billiardtoday_corporate_load_page_template($template) {
    global $post;
    
    if ($post) {
        $page_template = get_post_meta($post->ID, '_wp_page_template', true);
        
        if ($page_template) {
            $template = get_stylesheet_directory() . '/' . $page_template;
        }
    }
    
    return $template;
}
add_filter('template_include', 'billiardtoday_corporate_load_page_template');

/**
 * Add custom post types
 */
function billiardtoday_corporate_custom_post_types() {
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
    
    // Corporate Clients Post Type
    register_post_type('corporate_clients', array(
        'label' => __('Corporate Clients', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-building',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
}
add_action('init', 'billiardtoday_corporate_custom_post_types');

/**
 * Add custom taxonomies
 */
function billiardtoday_corporate_custom_taxonomies() {
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
    
    // Client Industries
    register_taxonomy('client_industry', 'corporate_clients', array(
        'label' => __('Industries', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
}
add_action('init', 'billiardtoday_corporate_custom_taxonomies');

/**
 * Add meta boxes
 */
function billiardtoday_corporate_add_meta_boxes() {
    add_meta_box(
        'tournament_details',
        __('Tournament Details', 'billiardtoday'),
        'billiardtoday_corporate_tournament_details_callback',
        'tournaments',
        'normal',
        'high'
    );
    
    add_meta_box(
        'client_details',
        __('Client Details', 'billiardtoday'),
        'billiardtoday_corporate_client_details_callback',
        'corporate_clients',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'billiardtoday_corporate_add_meta_boxes');

function billiardtoday_corporate_tournament_details_callback($post) {
    wp_nonce_field('billiardtoday_corporate_save_tournament_details', 'tournament_details_nonce');
    
    $start_date = get_post_meta($post->ID, '_start_date', true);
    $end_date = get_post_meta($post->ID, '_end_date', true);
    $location = get_post_meta($post->ID, '_location', true);
    $prize_pool = get_post_meta($post->ID, '_prize_pool', true);
    $corporate_client = get_post_meta($post->ID, '_corporate_client', true);
    
    ?>
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 15px;">
            <label for="start_date" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Start Date:', 'billiardtoday'); ?></label>
            <input type="date" id="start_date" name="start_date" value="<?php echo esc_attr($start_date); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="end_date" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('End Date:', 'billiardtoday'); ?></label>
            <input type="date" id="end_date" name="end_date" value="<?php echo esc_attr($end_date); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="location" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Location:', 'billiardtoday'); ?></label>
            <input type="text" id="location" name="location" value="<?php echo esc_attr($location); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="prize_pool" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Prize Pool:', 'billiardtoday'); ?></label>
            <input type="text" id="prize_pool" name="prize_pool" value="<?php echo esc_attr($prize_pool); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div>
            <label for="corporate_client" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Corporate Client:', 'billiardtoday'); ?></label>
            <input type="text" id="corporate_client" name="corporate_client" value="<?php echo esc_attr($corporate_client); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
    </div>
    <?php
}

function billiardtoday_corporate_client_details_callback($post) {
    wp_nonce_field('billiardtoday_corporate_save_client_details', 'client_details_nonce');
    
    $company_size = get_post_meta($post->ID, '_company_size', true);
    $industry = get_post_meta($post->ID, '_industry', true);
    $contract_start = get_post_meta($post->ID, '_contract_start', true);
    $contract_end = get_post_meta($post->ID, '_contract_end', true);
    
    ?>
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 15px;">
            <label for="company_size" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Company Size:', 'billiardtoday'); ?></label>
            <select id="company_size" name="company_size" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
                <option value=""><?php _e('Select Size', 'billiardtoday'); ?></option>
                <option value="small" <?php selected($company_size, 'small'); ?>><?php _e('Small (1-50)', 'billiardtoday'); ?></option>
                <option value="medium" <?php selected($company_size, 'medium'); ?>><?php _e('Medium (51-200)', 'billiardtoday'); ?></option>
                <option value="large" <?php selected($company_size, 'large'); ?>><?php _e('Large (201-1000)', 'billiardtoday'); ?></option>
                <option value="enterprise" <?php selected($company_size, 'enterprise'); ?>><?php _e('Enterprise (1000+)', 'billiardtoday'); ?></option>
            </select>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="industry" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Industry:', 'billiardtoday'); ?></label>
            <input type="text" id="industry" name="industry" value="<?php echo esc_attr($industry); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="contract_start" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Contract Start:', 'billiardtoday'); ?></label>
            <input type="date" id="contract_start" name="contract_start" value="<?php echo esc_attr($contract_start); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
        
        <div>
            <label for="contract_end" style="display: block; margin-bottom: 5px; color: #1e293b; font-weight: 600;"><?php _e('Contract End:', 'billiardtoday'); ?></label>
            <input type="date" id="contract_end" name="contract_end" value="<?php echo esc_attr($contract_end); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; color: #1e293b;">
        </div>
    </div>
    <?php
}

function billiardtoday_corporate_save_tournament_details($post_id) {
    if (!isset($_POST['tournament_details_nonce']) || !wp_verify_nonce($_POST['tournament_details_nonce'], 'billiardtoday_corporate_save_tournament_details')) {
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
    
    if (isset($_POST['corporate_client'])) {
        update_post_meta($post_id, '_corporate_client', sanitize_text_field($_POST['corporate_client']));
    }
}

function billiardtoday_corporate_save_client_details($post_id) {
    if (!isset($_POST['client_details_nonce']) || !wp_verify_nonce($_POST['client_details_nonce'], 'billiardtoday_corporate_save_client_details')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (isset($_POST['company_size'])) {
        update_post_meta($post_id, '_company_size', sanitize_text_field($_POST['company_size']));
    }
    
    if (isset($_POST['industry'])) {
        update_post_meta($post_id, '_industry', sanitize_text_field($_POST['industry']));
    }
    
    if (isset($_POST['contract_start'])) {
        update_post_meta($post_id, '_contract_start', sanitize_text_field($_POST['contract_start']));
    }
    
    if (isset($_POST['contract_end'])) {
        update_post_meta($post_id, '_contract_end', sanitize_text_field($_POST['contract_end']));
    }
}

add_action('save_post', 'billiardtoday_corporate_save_tournament_details');
add_action('save_post', 'billiardtoday_corporate_save_client_details');

/**
 * Add corporate specific CSS optimizations
 */
function billiardtoday_corporate_css_optimizations() {
    // Remove unnecessary CSS
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    
    // Add corporate critical CSS
    wp_add_inline_style('billiardtoday-corporate-style', '
        /* Critical CSS for corporate theme */
        body{font-family:Inter,sans-serif;background:#ffffff;color:#1e293b;line-height:1.6}
        .main-navigation{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(255,255,255,0.98);backdrop-filter:blur(20px);border-bottom:1px solid #e2e8f0}
        .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f8fafc 0%,#ffffff 100%)}
        .btn-primary{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#fff;padding:1rem 2rem;border-radius:8px;text-decoration:none}
        .feature-card{background:#ffffff;padding:2.5rem;border:1px solid #e2e8f0;border-radius:12px}
        .feature-icon{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);width:4rem;height:4rem;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff}
    ');
}
add_action('wp_enqueue_scripts', 'billiardtoday_corporate_css_optimizations', 100);

/**
 * Add corporate performance optimizations
 */
function billiardtoday_corporate_performance_optimizations() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    
    // Remove WordPress version
    remove_action('wp_head', 'wp_generator');
    
    // Remove RSD link
    remove_action('wp_head', 'rsd_link');
    
    // Remove Windows Live Writer manifest link
    remove_action('wp_head', 'wlwmanifest_link');
    
    // Add corporate meta tags
    echo '<meta name="color-scheme" content="light">';
    echo '<meta name="theme-color" content="#3b82f6">';
}
add_action('init', 'billiardtoday_corporate_performance_optimizations');

/**
 * Add corporate mode admin styles
 */
function billiardtoday_corporate_admin_styles() {
    ?>
    <style>
        .admin-color-corporate {
            --primary: #3b82f6;
            --secondary: #1e3a8a;
            --background: #ffffff;
            --surface: #f8fafc;
            --text: #1e293b;
            --text-muted: #475569;
        }
    </style>
    <?php
}
add_action('admin_head', 'billiardtoday_corporate_admin_styles');
?>
