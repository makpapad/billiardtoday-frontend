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
function billiardtoday_sport_fun_body_classes($classes) {
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
    $classes[] = 'billiardtoday-sport-fun';
    $classes[] = 'sport-fun-theme';
    $classes[] = 'gaming-theme';

    return $classes;
}
add_filter('body_class', 'billiardtoday_sport_fun_body_classes');

/**
 * Add a pingback url auto-discovery header for single posts, pages, or attachments.
 */
function billiardtoday_sport_fun_pingback_header() {
    if (is_singular() && pings_open()) {
        printf('<link rel="pingback" href="%s">', esc_url(get_bloginfo('pingback_url')));
    }
}
add_action('wp_head', 'billiardtoday_sport_fun_pingback_header');

/**
 * Change the excerpt more string.
 */
function billiardtoday_sport_fun_excerpt_more($more) {
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
add_filter('excerpt_more', 'billiardtoday_sport_fun_excerpt_more');

/**
 * Custom comment callback.
 */
function billiardtoday_sport_fun_comment($comment, $args, $depth) {
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
function billiardtoday_sport_fun_customizer_styles() {
    $primary_orange = get_theme_mod('primary_orange', '#ff6b35');
    $secondary_orange = get_theme_mod('secondary_orange', '#ff8c42');
    $accent_yellow = get_theme_mod('accent_yellow', '#ffd166');
    $bg_primary = get_theme_mod('bg_primary_fun', '#ffffff');
    $bg_secondary = get_theme_mod('bg_secondary_fun', '#fafafa');
    $text_primary = get_theme_mod('text_primary_fun', '#171717');
    $text_secondary = get_theme_mod('text_secondary_fun', '#404040');
    $font_family = get_theme_mod('font_family_fun', 'Poppins');
    $font_weight = get_theme_mod('font_weight_fun', '700');
    
    ob_start();
    ?>
    <style type="text/css">
        :root {
            --primary-orange: <?php echo esc_attr($primary_orange); ?>;
            --secondary-orange: <?php echo esc_attr($secondary_orange); ?>;
            --accent-yellow: <?php echo esc_attr($accent_yellow); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-secondary: <?php echo esc_attr($text_secondary); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .btn-primary,
        .nav-cta {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_orange); ?> 0%, <?php echo esc_attr($secondary_orange); ?> 100%);
        }
        
        .btn-secondary {
            border-color: <?php echo esc_attr($primary_orange); ?>;
            color: <?php echo esc_attr($primary_orange); ?>;
        }
        
        .btn-secondary:hover {
            background: <?php echo esc_attr($primary_orange); ?>;
            color: white;
        }
        
        .logo-icon {
            background: linear-gradient(135deg, #ff006e 0%, <?php echo esc_attr($primary_orange); ?> 25%, <?php echo esc_attr($accent_yellow); ?> 50%, #06ffa5 75%, #00d9ff 100%);
        }
        
        .social-link:hover {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_orange); ?> 0%, <?php echo esc_attr($secondary_orange); ?> 100%);
            border-color: <?php echo esc_attr($primary_orange); ?>;
        }
        
        .feature-icon {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_orange); ?> 0%, <?php echo esc_attr($secondary_orange); ?> 100%);
        }
        
        .hero-title {
            background: linear-gradient(135deg, #ff006e 0%, <?php echo esc_attr($primary_orange); ?> 25%, <?php echo esc_attr($accent_yellow); ?> 50%, #06ffa5 75%, #00d9ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .stat-number {
            color: <?php echo esc_attr($primary_orange); ?>;
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
add_action('wp_head', 'billiardtoday_sport_fun_customizer_styles');

/**
 * Add theme support for selective refresh for Customizer
 */
function billiardtoday_sport_fun_customize_partial_blogname() {
    bloginfo('name');
}
add_action('customize_partial_blogname', 'billiardtoday_sport_fun_customize_partial_blogname');

function billiardtoday_sport_fun_customize_partial_blogdescription() {
    bloginfo('description');
}
add_action('customize_partial_blogdescription', 'billiardtoday_sport_fun_customize_partial_blogdescription');

/**
 * Add WooCommerce support if WooCommerce is active
 */
if (class_exists('WooCommerce')) {
    function billiardtoday_sport_fun_woocommerce_setup() {
        add_theme_support('woocommerce');
        add_theme_support('wc-product-gallery-zoom');
        add_theme_support('wc-product-gallery-lightbox');
        add_theme_support('wc-product-gallery-slider');
        
        // Add fun support for WooCommerce
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
    add_action('after_setup_theme', 'billiardtoday_sport_fun_woocommerce_setup');
    
    // Add fun styles for WooCommerce
    function billiardtoday_sport_fun_woocommerce_styles() {
        ?>
        <style>
            .woocommerce {
                color: var(--text-secondary);
            }
            
            .woocommerce a {
                color: var(--primary-orange);
            }
            
            .woocommerce button,
            .woocommerce input.button,
            .woocommerce a.button {
                background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
                color: white;
                border: none;
                border-radius: 50px;
                font-family: "Fredoka One", cursive;
            }
            
            .woocommerce .woocommerce-message,
            .woocommerce .woocommerce-info {
                background: rgba(255, 107, 53, 0.1);
                border-color: var(--primary-orange);
                color: var(--text-primary);
                border-radius: 20px;
            }
            
            .woocommerce .woocommerce-error {
                background: rgba(255, 0, 110, 0.1);
                border-color: var(--accent-pink);
                color: var(--text-primary);
                border-radius: 20px;
            }
        </style>
        <?php
    }
    add_action('wp_head', 'billiardtoday_sport_fun_woocommerce_styles');
}

/**
 * Add custom page templates
 */
function billiardtoday_sport_fun_add_page_templates($templates) {
    $templates['page-templates/full-width.php'] = __('Full Width', 'billiardtoday');
    $templates['page-templates/landing-page.php'] = __('Landing Page', 'billiardtoday');
    $templates['page-templates/sport-fun.php'] = __('Sport Fun Layout', 'billiardtoday');
    return $templates;
}
add_filter('theme_page_templates', 'billiardtoday_sport_fun_add_page_templates');

/**
 * Load custom page templates
 */
function billiardtoday_sport_fun_load_page_template($template) {
    global $post;
    
    if ($post) {
        $page_template = get_post_meta($post->ID, '_wp_page_template', true);
        
        if ($page_template) {
            $template = get_stylesheet_directory() . '/' . $page_template;
        }
    }
    
    return $template;
}
add_filter('template_include', 'billiardtoday_sport_fun_load_page_template');

/**
 * Add custom post types
 */
function billiardtoday_sport_fun_custom_post_types() {
    // Games Post Type
    register_post_type('games', array(
        'label' => __('Games', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-games',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
    
    // Players Post Type
    register_post_type('fun_players', array(
        'label' => __('Fun Players', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-groups',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
    
    // Achievements Post Type
    register_post_type('achievements', array(
        'label' => __('Achievements', 'billiardtoday'),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-awards',
        'show_in_rest' => true,
        'publicly_queryable'  => true,
        'capability_type'    => 'post',
    ));
}
add_action('init', 'billiardtoday_sport_fun_custom_post_types');

/**
 * Add custom taxonomies
 */
function billiardtoday_sport_fun_custom_taxonomies() {
    // Game Categories
    register_taxonomy('game_category', 'games', array(
        'label' => __('Categories', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
    
    // Player Levels
    register_taxonomy('player_level', 'fun_players', array(
        'label' => __('Levels', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
    
    // Achievement Types
    register_taxonomy('achievement_type', 'achievements', array(
        'label' => __('Types', 'billiardtoday'),
        'hierarchical' => true,
        'show_in_rest' => true,
    ));
}
add_action('init', 'billiardtoday_sport_fun_custom_taxonomies');

/**
 * Add meta boxes
 */
function billiardtoday_sport_fun_add_meta_boxes() {
    add_meta_box(
        'game_details',
        __('Game Details', 'billiardtoday'),
        'billiardtoday_sport_fun_game_details_callback',
        'games',
        'normal',
        'high'
    );
    
    add_meta_box(
        'player_details',
        __('Player Details', 'billiardtoday'),
        'billiardtoday_sport_fun_player_details_callback',
        'fun_players',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'billiardtoday_sport_fun_add_meta_boxes');

function billiardtoday_sport_fun_game_details_callback($post) {
    wp_nonce_field('billiardtoday_sport_fun_save_game_details', 'game_details_nonce');
    
    $difficulty = get_post_meta($post->ID, '_difficulty', true);
    $min_players = get_post_meta($post->ID, '_min_players', true);
    $max_players = get_post_meta($post->ID, '_max_players', true);
    $game_type = get_post_meta($post->ID, '_game_type', true);
    
    ?>
    <div style="background: #fafafa; padding: 20px; border-radius: 20px; border: 2px solid #e5e5e5;">
        <div style="margin-bottom: 15px;">
            <label for="difficulty" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Difficulty:', 'billiardtoday'); ?></label>
            <select id="difficulty" name="difficulty" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
                <option value=""><?php _e('Select Difficulty', 'billiardtoday'); ?></option>
                <option value="easy" <?php selected($difficulty, 'easy'); ?>><?php _e('Easy', 'billiardtoday'); ?></option>
                <option value="medium" <?php selected($difficulty, 'medium'); ?>><?php _e('Medium', 'billiardtoday'); ?></option>
                <option value="hard" <?php selected($difficulty, 'hard'); ?>><?php _e('Hard', 'billiardtoday'); ?></option>
                <option value="expert" <?php selected($difficulty, 'expert'); ?>><?php _e('Expert', 'billiardtoday'); ?></option>
            </select>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="min_players" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Min Players:', 'billiardtoday'); ?></label>
            <input type="number" id="min_players" name="min_players" value="<?php echo esc_attr($min_players); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="max_players" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Max Players:', 'billiardtoday'); ?></label>
            <input type="number" id="max_players" name="max_players" value="<?php echo esc_attr($max_players); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
        
        <div>
            <label for="game_type" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Game Type:', 'billiardtoday'); ?></label>
            <input type="text" id="game_type" name="game_type" value="<?php echo esc_attr($game_type); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
    </div>
    <?php
}

function billiardtoday_sport_fun_player_details_callback($post) {
    wp_nonce_field('billiardtoday_sport_fun_save_player_details', 'player_details_nonce');
    
    $player_level = get_post_meta($post->ID, '_player_level', true);
    $player_score = get_post_meta($post->ID, '_player_score', true);
    $player_rank = get_post_meta($post->ID, '_player_rank', true);
    $player_badges = get_post_meta($post->ID, '_player_badges', true);
    
    ?>
    <div style="background: #fafafa; padding: 20px; border-radius: 20px; border: 2px solid #e5e5e5;">
        <div style="margin-bottom: 15px;">
            <label for="player_level" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Player Level:', 'billiardtoday'); ?></label>
            <input type="text" id="player_level" name="player_level" value="<?php echo esc_attr($player_level); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="player_score" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Player Score:', 'billiardtoday'); ?></label>
            <input type="number" id="player_score" name="player_score" value="<?php echo esc_attr($player_score); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="player_rank" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Player Rank:', 'billiardtoday'); ?></label>
            <input type="text" id="player_rank" name="player_rank" value="<?php echo esc_attr($player_rank); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
        
        <div>
            <label for="player_badges" style="display: block; margin-bottom: 5px; color: #171717; font-weight: 700; font-family: 'Fredoka One', cursive;"><?php _e('Player Badges:', 'billiardtoday'); ?></label>
            <input type="text" id="player_badges" name="player_badges" value="<?php echo esc_attr($player_badges); ?>" style="width: 100%; padding: 10px; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 15px; color: #171717; font-weight: 600;">
        </div>
    </div>
    <?php
}

function billiardtoday_sport_fun_save_game_details($post_id) {
    if (!isset($_POST['game_details_nonce']) || !wp_verify_nonce($_POST['game_details_nonce'], 'billiardtoday_sport_fun_save_game_details')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (isset($_POST['difficulty'])) {
        update_post_meta($post_id, '_difficulty', sanitize_text_field($_POST['difficulty']));
    }
    
    if (isset($_POST['min_players'])) {
        update_post_meta($post_id, '_min_players', sanitize_text_field($_POST['min_players']));
    }
    
    if (isset($_POST['max_players'])) {
        update_post_meta($post_id, '_max_players', sanitize_text_field($_POST['max_players']));
    }
    
    if (isset($_POST['game_type'])) {
        update_post_meta($post_id, '_game_type', sanitize_text_field($_POST['game_type']));
    }
}

function billiardtoday_sport_fun_save_player_details($post_id) {
    if (!isset($_POST['player_details_nonce']) || !wp_verify_nonce($_POST['player_details_nonce'], 'billiardtoday_sport_fun_save_player_details')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (isset($_POST['player_level'])) {
        update_post_meta($post_id, '_player_level', sanitize_text_field($_POST['player_level']));
    }
    
    if (isset($_POST['player_score'])) {
        update_post_meta($post_id, '_player_score', sanitize_text_field($_POST['player_score']));
    }
    
    if (isset($_POST['player_rank'])) {
        update_post_meta($post_id, '_player_rank', sanitize_text_field($_POST['player_rank']));
    }
    
    if (isset($_POST['player_badges'])) {
        update_post_meta($post_id, '_player_badges', sanitize_text_field($_POST['player_badges']));
    }
}

add_action('save_post', 'billiardtoday_sport_fun_save_game_details');
add_action('save_post', 'billiardtoday_sport_fun_save_player_details');

/**
 * Add fun specific CSS optimizations
 */
function billiardtoday_sport_fun_css_optimizations() {
    // Remove unnecessary CSS
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    
    // Add fun critical CSS
    wp_add_inline_style('billiardtoday-sport-fun-style', '
        /* Critical CSS for sport fun theme */
        body{font-family:Poppins,sans-serif;background:#ffffff;color:#171717;line-height:1.6}
        .main-navigation{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);border-bottom:2px solid #e5e5e5}
        .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fafafa 0%,#ffffff 100%)}
        .btn-primary{background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);color:#fff;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-family:"Fredoka One",cursive}
        .feature-card{background:#ffffff;padding:2.5rem;border:2px solid #e5e5e5;border-radius:20px}
        .feature-icon{background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);width:4rem;height:4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
    ');
}
add_action('wp_enqueue_scripts', 'billiardtoday_sport_fun_css_optimizations', 100);

/**
 * Add fun specific performance optimizations
 */
function billiardtoday_sport_fun_performance_optimizations() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    
    // Remove WordPress version
    remove_action('wp_head', 'wp_generator');
    
    // Remove RSD link
    remove_action('wp_head', 'rsd_link');
    
    // Remove Windows Live Writer manifest link
    remove_action('wp_head', 'wlwmanifest_link');
    
    // Add fun meta tags
    echo '<meta name="color-scheme" content="light">';
    echo '<meta name="theme-color" content="#ff6b35">';
}
add_action('init', 'billiardtoday_sport_fun_performance_optimizations');

/**
 * Add fun mode admin styles
 */
function billiardtoday_sport_fun_admin_styles() {
    ?>
    <style>
        .admin-color-sport-fun {
            --primary: #ff6b35;
            --secondary: #ff8c42;
            --background: #ffffff;
            --surface: #fafafa;
            --text: #171717;
            --text-muted: #404040;
        }
    </style>
    <?php
}
add_action('admin_head', 'billiardtoday_sport_fun_admin_styles');
?>
