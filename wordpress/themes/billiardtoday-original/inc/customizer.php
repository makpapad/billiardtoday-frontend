<?php
/**
 * Customizer functionality for BilliardToday Original Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for selective refresh
 */
function billiardtoday_original_customize_register($wp_customize) {
    
    // Theme Color Settings
    $wp_customize->add_section('billiardtoday_colors', array(
        'title'    => __('Theme Colors', 'billiardtoday'),
        'priority' => 30,
    ));
    
    // Primary Color
    $wp_customize->add_setting('primary_color', array(
        'default'           => '#8b5cf6',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_color', array(
        'label'    => __('Primary Color', 'billiardtoday'),
        'section'  => 'billiardtoday_colors',
        'settings' => 'primary_color',
    )));
    
    // Secondary Color
    $wp_customize->add_setting('secondary_color', array(
        'default'           => '#ec4899',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_color', array(
        'label'    => __('Secondary Color', 'billiardtoday'),
        'section'  => 'billiardtoday_colors',
        'settings' => 'secondary_color',
    )));
    
    // Accent Color
    $wp_customize->add_setting('accent_color', array(
        'default'           => '#00ff88',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_color', array(
        'label'    => __('Accent Color', 'billiardtoday'),
        'section'  => 'billiardtoday_colors',
        'settings' => 'accent_color',
    )));
    
    // Typography Settings
    $wp_customize->add_section('billiardtoday_typography', array(
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
        'section'  => 'billiardtoday_typography',
        'type'     => 'select',
        'choices'  => array(
            'Inter'         => 'Inter',
            'Roboto'        => 'Roboto',
            'Open Sans'     => 'Open Sans',
            'Montserrat'    => 'Montserrat',
            'Poppins'       => 'Poppins',
        ),
    ));
    
    // Header Settings
    $wp_customize->add_section('billiardtoday_header', array(
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
        'section'  => 'billiardtoday_header',
        'settings' => 'custom_logo',
        'height'   => 100,
        'width'    => 100,
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
        'section'  => 'billiardtoday_header',
        'type'     => 'checkbox',
    ));
    
    // Tagline Display
    $wp_customize->add_setting('display_tagline', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('display_tagline', array(
        'label'    => __('Display Tagline', 'billiardtoday'),
        'section'  => 'billiardtoday_header',
        'type'     => 'checkbox',
    ));
    
    // Footer Settings
    $wp_customize->add_section('billiardtoday_footer', array(
        'title'    => __('Footer Settings', 'billiardtoday'),
        'priority' => 45,
    ));
    
    // Copyright Text
    $wp_customize->add_setting('copyright_text', array(
        'default'           => __('© 2024 BilliardToday. All rights reserved.', 'billiardtoday'),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('copyright_text', array(
        'label'    => __('Copyright Text', 'billiardtoday'),
        'section'  => 'billiardtoday_footer',
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
        'section'  => 'billiardtoday_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('twitter_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('twitter_url', array(
        'label'    => __('Twitter URL', 'billiardtoday'),
        'section'  => 'billiardtoday_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('linkedin_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('linkedin_url', array(
        'label'    => __('LinkedIn URL', 'billiardtoday'),
        'section'  => 'billiardtoday_footer',
        'type'     => 'url',
    ));
}
add_action('customize_register', 'billiardtoday_original_customize_register');

/**
 * Customizer JS for live preview
 */
function billiardtoday_original_customize_preview_js() {
    wp_enqueue_script('billiardtoday-customizer', get_template_directory_uri() . '/js/customizer.js', array('customize-preview'), '1.0.0', true);
}
add_action('customize_preview_init', 'billiardtoday_original_customize_preview_js');

/**
 * Generate custom CSS from customizer settings
 */
function billiardtoday_original_customizer_css() {
    $primary_color = get_theme_mod('primary_color', '#8b5cf6');
    $secondary_color = get_theme_mod('secondary_color', '#ec4899');
    $accent_color = get_theme_mod('accent_color', '#00ff88');
    $font_family = get_theme_mod('font_family', 'Inter');
    
    ?>
    <style type="text/css">
        :root {
            --accent-purple: <?php echo esc_attr($primary_color); ?>;
            --accent-pink: <?php echo esc_attr($secondary_color); ?>;
            --accent-green: <?php echo esc_attr($accent_color); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .gradient-primary {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_color); ?> 0%, <?php echo esc_attr($secondary_color); ?> 100%);
        }
        
        .gradient-secondary {
            background: linear-gradient(135deg, <?php echo esc_attr($accent_color); ?> 0%, #00d9ff 100%);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_color); ?> 0%, <?php echo esc_attr($secondary_color); ?> 100%);
        }
        
        .nav-cta {
            background: linear-gradient(135deg, <?php echo esc_attr($primary_color); ?> 0%, <?php echo esc_attr($secondary_color); ?> 100%);
        }
        
        body {
            font-family: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
    </style>
    <?php
}
add_action('wp_head', 'billiardtoday_original_customizer_css');
?>
