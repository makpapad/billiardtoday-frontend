<?php
/**
 * Customizer functionality for BilliardToday Sport Fun Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for selective refresh
 */
function billiardtoday_sport_fun_customize_register($wp_customize) {
    
    // Sport Fun Color Settings
    $wp_customize->add_section('billiardtoday_sport_fun_colors', array(
        'title'    => __('Sport Fun Colors', 'billiardtoday'),
        'priority' => 30,
    ));
    
    // Primary Orange
    $wp_customize->add_setting('primary_orange', array(
        'default'           => '#ff6b35',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_orange', array(
        'label'    => __('Primary Orange', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'primary_orange',
    )));
    
    // Secondary Orange
    $wp_customize->add_setting('secondary_orange', array(
        'default'           => '#ff8c42',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_orange', array(
        'label'    => __('Secondary Orange', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'secondary_orange',
    )));
    
    // Accent Yellow
    $wp_customize->add_setting('accent_yellow', array(
        'default'           => '#ffd166',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_yellow', array(
        'label'    => __('Accent Yellow', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'accent_yellow',
    )));
    
    // Accent Green
    $wp_customize->add_setting('accent_green', array(
        'default'           => '#06ffa5',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_green', array(
        'label'    => __('Accent Green', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'accent_green',
    )));
    
    // Accent Blue
    $wp_customize->add_setting('accent_blue', array(
        'default'           => '#00d9ff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_blue', array(
        'label'    => __('Accent Blue', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'accent_blue',
    )));
    
    // Accent Purple
    $wp_customize->add_setting('accent_purple', array(
        'default'           => '#8b5cf6',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_purple', array(
        'label'    => __('Accent Purple', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'accent_purple',
    )));
    
    // Accent Pink
    $wp_customize->add_setting('accent_pink', array(
        'default'           => '#ff006e',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_pink', array(
        'label'    => __('Accent Pink', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'accent_pink',
    )));
    
    // Background Colors
    $wp_customize->add_setting('bg_primary_fun', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_primary_fun', array(
        'label'    => __('Primary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'bg_primary_fun',
    )));
    
    $wp_customize->add_setting('bg_secondary_fun', array(
        'default'           => '#fafafa',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_secondary_fun', array(
        'label'    => __('Secondary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'bg_secondary_fun',
    )));
    
    // Text Colors
    $wp_customize->add_setting('text_primary_fun', array(
        'default'           => '#171717',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_primary_fun', array(
        'label'    => __('Primary Text', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'text_primary_fun',
    )));
    
    $wp_customize->add_setting('text_secondary_fun', array(
        'default'           => '#404040',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_secondary_fun', array(
        'label'    => __('Secondary Text', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_colors',
        'settings' => 'text_secondary_fun',
    )));
    
    // Typography Settings
    $wp_customize->add_section('billiardtoday_sport_fun_typography', array(
        'title'    => __('Typography', 'billiardtoday'),
        'priority' => 35,
    ));
    
    // Font Family
    $wp_customize->add_setting('font_family_fun', array(
        'default'           => 'Poppins',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_family_fun', array(
        'label'    => __('Font Family', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_typography',
        'type'     => 'select',
        'choices'  => array(
            'Poppins'         => 'Poppins',
            'Fredoka One'     => 'Fredoka One',
            'Comic Neue'      => 'Comic Neue',
            'Bangers'         => 'Bangers',
            'Luckiest Guy'    => 'Luckiest Guy',
            'Press Start 2P'  => 'Press Start 2P',
            'Inter'           => 'Inter',
            'Roboto'          => 'Roboto',
        ),
    ));
    
    // Fun Font Weight
    $wp_customize->add_setting('font_weight_fun', array(
        'default'           => '700',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_weight_fun', array(
        'label'    => __('Base Font Weight', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_typography',
        'type'     => 'select',
        'choices'  => array(
            '400' => 'Regular',
            '500' => 'Medium',
            '600' => 'Semi Bold',
            '700' => 'Bold',
            '800' => 'Extra Bold',
            '900' => 'Black',
        ),
    ));
    
    // Header Settings
    $wp_customize->add_section('billiardtoday_sport_fun_header', array(
        'title'    => __('Header Settings', 'billiardtoday'),
        'priority' => 40,
    ));
    
    // Logo Upload
    $wp_customize->add_setting('custom_logo_fun', array(
        'default'           => '',
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Cropped_Image_Control($wp_customize, 'custom_logo_fun', array(
        'label'    => __('Logo', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_header',
        'settings' => 'custom_logo_fun',
        'height'   => 100,
        'width'    => 100,
        'flex_height' => true,
        'flex_width'  => true,
    )));
    
    // Site Title Display
    $wp_customize->add_setting('display_site_title_fun', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('display_site_title_fun', array(
        'label'    => __('Display Site Title', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_header',
        'type'     => 'checkbox',
    ));
    
    // Footer Settings
    $wp_customize->add_section('billiardtoday_sport_fun_footer', array(
        'title'    => __('Footer Settings', 'billiardtoday'),
        'priority' => 45,
    ));
    
    // Copyright Text
    $wp_customize->add_setting('copyright_text_fun', array(
        'default'           => __('© 2024 BilliardToday. All rights reserved. Fun gaming tournament platform! 🎮', 'billiardtoday'),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('copyright_text_fun', array(
        'label'    => __('Copyright Text', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_footer',
        'type'     => 'textarea',
    ));
    
    // Social Links
    $wp_customize->add_setting('facebook_url_fun', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('facebook_url_fun', array(
        'label'    => __('Facebook URL', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('twitter_url_fun', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('twitter_url_fun', array(
        'label'    => __('Twitter URL', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('linkedin_url_fun', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('linkedin_url_fun', array(
        'label'    => __('LinkedIn URL', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_footer',
        'type'     => 'url',
    ));
    
    // Sport Fun Settings
    $wp_customize->add_section('billiardtoday_sport_fun_settings', array(
        'title'    => __('Sport Fun Settings', 'billiardtoday'),
        'priority' => 50,
    ));
    
    // Fun Tagline
    $wp_customize->add_setting('fun_tagline', array(
        'default'           => __('Exciting and playful billiard tournament platform', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('fun_tagline', array(
        'label'    => __('Fun Tagline', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    // CTA Button Text
    $wp_customize->add_setting('cta_button_text_fun', array(
        'default'           => __('Start Playing', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('cta_button_text_fun', array(
        'label'    => __('CTA Button Text', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    // Demo Button Text
    $wp_customize->add_setting('demo_button_text_fun', array(
        'default'           => __('Watch Demo', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('demo_button_text_fun', array(
        'label'    => __('Demo Button Text', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    // Stats Configuration
    $wp_customize->add_setting('stats_players_fun', array(
        'default'           => '1000+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_players_fun', array(
        'label'    => __('Fun Players Count', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_events_fun', array(
        'default'           => '500+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_events_fun', array(
        'label'    => __('Gaming Events Count', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_matches_fun', array(
        'default'           => '25K+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_matches_fun', array(
        'label'    => __('Awesome Matches Count', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_fun_factor', array(
        'default'           => '99%',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_fun_factor', array(
        'label'    => __('Fun Factor', 'billiardtoday'),
        'section'  => 'billiardtoday_sport_fun_settings',
        'type'     => 'text',
    ));
}
add_action('customize_register', 'billiardtoday_sport_fun_customize_register');

/**
 * Customizer JS for live preview
 */
function billiardtoday_sport_fun_customize_preview_js() {
    wp_enqueue_script('billiardtoday-sport-fun-customizer', get_template_directory_uri() . '/js/customizer.js', array('customize-preview'), '1.0.0', true);
}
add_action('customize_preview_init', 'billiardtoday_sport_fun_customize_preview_js');

/**
 * Generate custom CSS from customizer settings
 */
function billiardtoday_sport_fun_customizer_css() {
    $primary_orange = get_theme_mod('primary_orange', '#ff6b35');
    $secondary_orange = get_theme_mod('secondary_orange', '#ff8c42');
    $accent_yellow = get_theme_mod('accent_yellow', '#ffd166');
    $accent_green = get_theme_mod('accent_green', '#06ffa5');
    $accent_blue = get_theme_mod('accent_blue', '#00d9ff');
    $accent_purple = get_theme_mod('accent_purple', '#8b5cf6');
    $accent_pink = get_theme_mod('accent_pink', '#ff006e');
    $bg_primary = get_theme_mod('bg_primary_fun', '#ffffff');
    $bg_secondary = get_theme_mod('bg_secondary_fun', '#fafafa');
    $text_primary = get_theme_mod('text_primary_fun', '#171717');
    $text_secondary = get_theme_mod('text_secondary_fun', '#404040');
    $font_family = get_theme_mod('font_family_fun', 'Poppins');
    $font_weight = get_theme_mod('font_weight_fun', '700');
    
    ?>
    <style type="text/css">
        :root {
            --primary-orange: <?php echo esc_attr($primary_orange); ?>;
            --secondary-orange: <?php echo esc_attr($secondary_orange); ?>;
            --accent-yellow: <?php echo esc_attr($accent_yellow); ?>;
            --accent-green: <?php echo esc_attr($accent_green); ?>;
            --accent-blue: <?php echo esc_attr($accent_blue); ?>;
            --accent-purple: <?php echo esc_attr($accent_purple); ?>;
            --accent-pink: <?php echo esc_attr($accent_pink); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-secondary: <?php echo esc_attr($text_secondary); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --gradient-primary: linear-gradient(135deg, <?php echo esc_attr($primary_orange); ?> 0%, <?php echo esc_attr($secondary_orange); ?> 100%);
            --gradient-secondary: linear-gradient(135deg, <?php echo esc_attr($accent_yellow); ?> 0%, <?php echo esc_attr($accent_green); ?> 100%);
            --gradient-fun: linear-gradient(135deg, <?php echo esc_attr($accent_blue); ?> 0%, <?php echo esc_attr($accent_purple); ?> 100%);
            --gradient-rainbow: linear-gradient(135deg, <?php echo esc_attr($accent_pink); ?> 0%, <?php echo esc_attr($primary_orange); ?> 25%, <?php echo esc_attr($accent_yellow); ?> 50%, <?php echo esc_attr($accent_green); ?> 75%, <?php echo esc_attr($accent_blue); ?> 100%);
        }
        
        .btn-primary,
        .nav-cta {
            background: var(--gradient-primary);
        }
        
        .btn-secondary {
            border-color: var(--primary-orange);
            color: var(--primary-orange);
        }
        
        .btn-secondary:hover {
            background: var(--primary-orange);
            color: white;
        }
        
        .logo-icon {
            background: var(--gradient-rainbow);
        }
        
        .social-link:hover {
            background: var(--gradient-primary);
            border-color: var(--primary-orange);
        }
        
        .feature-icon {
            background: var(--gradient-primary);
        }
        
        .hero-title {
            background: var(--gradient-rainbow);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .section-title {
            color: var(--text-primary);
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        .stat-number {
            color: var(--primary-orange);
        }
        
        .badge-primary {
            background: var(--gradient-primary);
            color: white;
        }
        
        .badge-success {
            background: var(--gradient-secondary);
            color: white;
        }
        
        .badge-warning {
            background: linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary-orange) 100%);
            color: white;
        }
        
        .badge-error {
            background: linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-purple) 100%);
            color: white;
        }
    </style>
    <?php
}
add_action('wp_head', 'billiardtoday_sport_fun_customizer_css');

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
?>
