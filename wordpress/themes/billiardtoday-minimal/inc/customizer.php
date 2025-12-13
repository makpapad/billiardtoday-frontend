<?php
/**
 * Customizer functionality for BilliardToday Minimal Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for selective refresh
 */
function billiardtoday_minimal_customize_register($wp_customize) {
    
    // Theme Color Settings
    $wp_customize->add_section('billiardtoday_minimal_colors', array(
        'title'    => __('Theme Colors', 'billiardtoday'),
        'priority' => 30,
    ));
    
    // Primary Color
    $wp_customize->add_setting('primary_color', array(
        'default'           => '#000000',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_color', array(
        'label'    => __('Primary Color', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'primary_color',
    )));
    
    // Secondary Color
    $wp_customize->add_setting('secondary_color', array(
        'default'           => '#333333',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_color', array(
        'label'    => __('Secondary Color', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'secondary_color',
    )));
    
    // Text Colors
    $wp_customize->add_setting('text_primary', array(
        'default'           => '#1a1a1a',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_primary', array(
        'label'    => __('Primary Text Color', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'text_primary',
    )));
    
    $wp_customize->add_setting('text_muted', array(
        'default'           => '#666666',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_muted', array(
        'label'    => __('Muted Text Color', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'text_muted',
    )));
    
    // Background Colors
    $wp_customize->add_setting('bg_primary', array(
        'default'           => '#fafafa',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_primary', array(
        'label'    => __('Primary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'bg_primary',
    )));
    
    $wp_customize->add_setting('bg_secondary', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_secondary', array(
        'label'    => __('Secondary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_colors',
        'settings' => 'bg_secondary',
    )));
    
    // Typography Settings
    $wp_customize->add_section('billiardtoday_minimal_typography', array(
        'title'    => __('Typography', 'billiardtoday'),
        'priority' => 35,
    ));
    
    // Font Family
    $wp_customize->add_setting('font_family', array(
        'default'           => 'Inter',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_family', array(
        'label'    => __('Font Family', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_typography',
        'type'     => 'select',
        'choices'  => array(
            'Inter'         => 'Inter',
            'Roboto'        => 'Roboto',
            'Open Sans'     => 'Open Sans',
            'Montserrat'    => 'Montserrat',
            'Poppins'       => 'Poppins',
            'Playfair Display' => 'Playfair Display',
            'System UI'     => 'System UI',
        ),
    ));
    
    // Font Weight
    $wp_customize->add_setting('font_weight', array(
        'default'           => '400',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_weight', array(
        'label'    => __('Base Font Weight', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_typography',
        'type'     => 'select',
        'choices'  => array(
            '300' => 'Light',
            '400' => 'Regular',
            '500' => 'Medium',
            '600' => 'Semi Bold',
            '700' => 'Bold',
        ),
    ));
    
    // Header Settings
    $wp_customize->add_section('billiardtoday_minimal_header', array(
        'title'    => __('Header Settings', 'billiardtoday'),
        'priority' => 40,
    ));
    
    // Logo Upload
    $wp_customize->add_setting('custom_logo', array(
        'default'           => '',
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Cropped_Image_Control($wp_customize, 'custom_logo', array(
        'label'    => __('Logo', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_header',
        'settings' => 'custom_logo',
        'height'   => 80,
        'width'    => 80,
        'flex_height' => true,
        'flex_width'  => true,
    )));
    
    // Site Title Display
    $wp_customize->add_setting('display_site_title', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('display_site_title', array(
        'label'    => __('Display Site Title', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_header',
        'type'     => 'checkbox',
    ));
    
    // Footer Settings
    $wp_customize->add_section('billiardtoday_minimal_footer', array(
        'title'    => __('Footer Settings', 'billiardtoday'),
        'priority' => 45,
    ));
    
    // Copyright Text
    $wp_customize->add_setting('copyright_text', array(
        'default'           => __('© 2024 BilliardToday. All rights reserved. Minimal design for maximum focus.', 'billiardtoday'),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('copyright_text', array(
        'label'    => __('Copyright Text', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_footer',
        'type'     => 'textarea',
    ));
    
    // Social Links
    $wp_customize->add_setting('facebook_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('facebook_url', array(
        'label'    => __('Facebook URL', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('twitter_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('twitter_url', array(
        'label'    => __('Twitter URL', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('linkedin_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('linkedin_url', array(
        'label'    => __('LinkedIn URL', 'billiardtoday'),
        'section'  => 'billiardtoday_minimal_footer',
        'type'     => 'url',
    ));
}
add_action('customize_register', 'billiardtoday_minimal_customize_register');

/**
 * Customizer JS for live preview
 */
function billiardtoday_minimal_customize_preview_js() {
    wp_enqueue_script('billiardtoday-minimal-customizer', get_template_directory_uri() . '/js/customizer.js', array('customize-preview'), '1.0.0', true);
}
add_action('customize_preview_init', 'billiardtoday_minimal_customize_preview_js');

/**
 * Generate custom CSS from customizer settings
 */
function billiardtoday_minimal_customizer_css() {
    $primary_color = get_theme_mod('primary_color', '#000000');
    $secondary_color = get_theme_mod('secondary_color', '#333333');
    $text_primary = get_theme_mod('text_primary', '#1a1a1a');
    $text_muted = get_theme_mod('text_muted', '#666666');
    $bg_primary = get_theme_mod('bg_primary', '#fafafa');
    $bg_secondary = get_theme_mod('bg_secondary', '#ffffff');
    $font_family = get_theme_mod('font_family', 'Inter');
    $font_weight = get_theme_mod('font_weight', '400');
    
    ?>
    <style type="text/css">
        :root {
            --accent-primary: <?php echo esc_attr($primary_color); ?>;
            --accent-secondary: <?php echo esc_attr($secondary_color); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-muted: <?php echo esc_attr($text_muted); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        body {
            font-family: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        .btn-primary,
        .nav-cta {
            background: <?php echo esc_attr($primary_color); ?>;
        }
        
        .btn-secondary {
            border-color: var(--bg-border);
            color: var(--text-primary);
        }
        
        .btn-secondary:hover {
            background: <?php echo esc_attr($bg_primary); ?>;
        }
        
        .logo-icon {
            background: <?php echo esc_attr($primary_color); ?>;
        }
        
        .social-link:hover {
            background: <?php echo esc_attr($primary_color); ?>;
            border-color: <?php echo esc_attr($primary_color); ?>;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        .hero-title {
            color: <?php echo esc_attr($text_primary); ?>;
        }
        
        .feature-title {
            color: <?php echo esc_attr($text_primary); ?>;
        }
    </style>
    <?php
}
add_action('wp_head', 'billiardtoday_minimal_customizer_css');
?>
