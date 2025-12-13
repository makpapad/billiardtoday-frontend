<?php
/**
 * Customizer functionality for BilliardToday Corporate Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for selective refresh
 */
function billiardtoday_corporate_customize_register($wp_customize) {
    
    // Corporate Color Settings
    $wp_customize->add_section('billiardtoday_corporate_colors', array(
        'title'    => __('Corporate Colors', 'billiardtoday'),
        'priority' => 30,
    ));
    
    // Primary Blue
    $wp_customize->add_setting('primary_blue', array(
        'default'           => '#1e3a8a',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_blue', array(
        'label'    => __('Primary Blue', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'primary_blue',
    )));
    
    // Secondary Blue
    $wp_customize->add_setting('secondary_blue', array(
        'default'           => '#3b82f6',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_blue', array(
        'label'    => __('Secondary Blue', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'secondary_blue',
    )));
    
    // Accent Blue
    $wp_customize->add_setting('accent_blue', array(
        'default'           => '#60a5fa',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_blue', array(
        'label'    => __('Accent Blue', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'accent_blue',
    )));
    
    // Success Green
    $wp_customize->add_setting('success_green', array(
        'default'           => '#10b981',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'success_green', array(
        'label'    => __('Success Green', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'success_green',
    )));
    
    // Warning Amber
    $wp_customize->add_setting('warning_amber', array(
        'default'           => '#f59e0b',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'warning_amber', array(
        'label'    => __('Warning Amber', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'warning_amber',
    )));
    
    // Error Red
    $wp_customize->add_setting('error_red', array(
        'default'           => '#ef4444',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'error_red', array(
        'label'    => __('Error Red', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'error_red',
    )));
    
    // Background Colors
    $wp_customize->add_setting('bg_primary_corporate', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_primary_corporate', array(
        'label'    => __('Primary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'bg_primary_corporate',
    )));
    
    $wp_customize->add_setting('bg_secondary_corporate', array(
        'default'           => '#f8fafc',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_secondary_corporate', array(
        'label'    => __('Secondary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'bg_secondary_corporate',
    )));
    
    // Text Colors
    $wp_customize->add_setting('text_primary_corporate', array(
        'default'           => '#1e293b',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_primary_corporate', array(
        'label'    => __('Primary Text', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'text_primary_corporate',
    )));
    
    $wp_customize->add_setting('text_secondary_corporate', array(
        'default'           => '#475569',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_secondary_corporate', array(
        'label'    => __('Secondary Text', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_colors',
        'settings' => 'text_secondary_corporate',
    )));
    
    // Typography Settings
    $wp_customize->add_section('billiardtoday_corporate_typography', array(
        'title'    => __('Typography', 'billiardtoday'),
        'priority' => 35,
    ));
    
    // Font Family
    $wp_customize->add_setting('font_family_corporate', array(
        'default'           => 'Inter',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_family_corporate', array(
        'label'    => __('Font Family', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_typography',
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
    $wp_customize->add_setting('font_weight_corporate', array(
        'default'           => '700',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_weight_corporate', array(
        'label'    => __('Base Font Weight', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_typography',
        'type'     => 'select',
        'choices'  => array(
            '400' => 'Regular',
            '500' => 'Medium',
            '600' => 'Semi Bold',
            '700' => 'Bold',
            '800' => 'Extra Bold',
        ),
    ));
    
    // Header Settings
    $wp_customize->add_section('billiardtoday_corporate_header', array(
        'title'    => __('Header Settings', 'billiardtoday'),
        'priority' => 40,
    ));
    
    // Logo Upload
    $wp_customize->add_setting('custom_logo_corporate', array(
        'default'           => '',
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Cropped_Image_Control($wp_customize, 'custom_logo_corporate', array(
        'label'    => __('Logo', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_header',
        'settings' => 'custom_logo_corporate',
        'height'   => 100,
        'width'    => 100,
        'flex_height' => true,
        'flex_width'  => true,
    )));
    
    // Site Title Display
    $wp_customize->add_setting('display_site_title_corporate', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('display_site_title_corporate', array(
        'label'    => __('Display Site Title', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_header',
        'type'     => 'checkbox',
    ));
    
    // Footer Settings
    $wp_customize->add_section('billiardtoday_corporate_footer', array(
        'title'    => __('Footer Settings', 'billiardtoday'),
        'priority' => 45,
    ));
    
    // Copyright Text
    $wp_customize->add_setting('copyright_text_corporate', array(
        'default'           => __('© 2024 BilliardToday. All rights reserved. Professional corporate tournament management.', 'billiardtoday'),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('copyright_text_corporate', array(
        'label'    => __('Copyright Text', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_footer',
        'type'     => 'textarea',
    ));
    
    // Social Links
    $wp_customize->add_setting('facebook_url_corporate', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('facebook_url_corporate', array(
        'label'    => __('Facebook URL', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('twitter_url_corporate', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('twitter_url_corporate', array(
        'label'    => __('Twitter URL', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('linkedin_url_corporate', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('linkedin_url_corporate', array(
        'label'    => __('LinkedIn URL', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_footer',
        'type'     => 'url',
    ));
    
    // Corporate Settings
    $wp_customize->add_section('billiardtoday_corporate_settings', array(
        'title'    => __('Corporate Settings', 'billiardtoday'),
        'priority' => 50,
    ));
    
    // Company Tagline
    $wp_customize->add_setting('company_tagline', array(
        'default'           => __('Enterprise Tournament Management Platform', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('company_tagline', array(
        'label'    => __('Company Tagline', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    // CTA Button Text
    $wp_customize->add_setting('cta_button_text', array(
        'default'           => __('Start Free Trial', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('cta_button_text', array(
        'label'    => __('CTA Button Text', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    // Demo Button Text
    $wp_customize->add_setting('demo_button_text', array(
        'default'           => __('Request Demo', 'billiardtoday'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('demo_button_text', array(
        'label'    => __('Demo Button Text', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    // Stats Configuration
    $wp_customize->add_setting('stats_clients', array(
        'default'           => '500+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_clients', array(
        'label'    => __('Clients Count', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_tournaments', array(
        'default'           => '10K+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_tournaments', array(
        'label'    => __('Tournaments Count', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_players', array(
        'default'           => '50K+',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_players', array(
        'label'    => __('Players Count', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
    
    $wp_customize->add_setting('stats_uptime', array(
        'default'           => '99.9%',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('stats_uptime', array(
        'label'    => __('Uptime', 'billiardtoday'),
        'section'  => 'billiardtoday_corporate_settings',
        'type'     => 'text',
    ));
}
add_action('customize_register', 'billiardtoday_corporate_customize_register');

/**
 * Customizer JS for live preview
 */
function billiardtoday_corporate_customize_preview_js() {
    wp_enqueue_script('billiardtoday-corporate-customizer', get_template_directory_uri() . '/js/customizer.js', array('customize-preview'), '1.0.0', true);
}
add_action('customize_preview_init', 'billiardtoday_corporate_customize_preview_js');

/**
 * Generate custom CSS from customizer settings
 */
function billiardtoday_corporate_customizer_css() {
    $primary_blue = get_theme_mod('primary_blue', '#1e3a8a');
    $secondary_blue = get_theme_mod('secondary_blue', '#3b82f6');
    $accent_blue = get_theme_mod('accent_blue', '#60a5fa');
    $success_green = get_theme_mod('success_green', '#10b981');
    $warning_amber = get_theme_mod('warning_amber', '#f59e0b');
    $error_red = get_theme_mod('error_red', '#ef4444');
    $bg_primary = get_theme_mod('bg_primary_corporate', '#ffffff');
    $bg_secondary = get_theme_mod('bg_secondary_corporate', '#f8fafc');
    $text_primary = get_theme_mod('text_primary_corporate', '#1e293b');
    $text_secondary = get_theme_mod('text_secondary_corporate', '#475569');
    $font_family = get_theme_mod('font_family_corporate', 'Inter');
    $font_weight = get_theme_mod('font_weight_corporate', '700');
    
    ?>
    <style type="text/css">
        :root {
            --primary-blue: <?php echo esc_attr($primary_blue); ?>;
            --secondary-blue: <?php echo esc_attr($secondary_blue); ?>;
            --accent-blue: <?php echo esc_attr($accent_blue); ?>;
            --success-green: <?php echo esc_attr($success_green); ?>;
            --warning-amber: <?php echo esc_attr($warning_amber); ?>;
            --error-red: <?php echo esc_attr($error_red); ?>;
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-secondary: <?php echo esc_attr($text_secondary); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --gradient-primary: linear-gradient(135deg, <?php echo esc_attr($primary_blue); ?> 0%, <?php echo esc_attr($secondary_blue); ?> 100%);
            --gradient-secondary: linear-gradient(135deg, <?php echo esc_attr($secondary_blue); ?> 0%, <?php echo esc_attr($accent_blue); ?> 100%);
        }
        
        body {
            font-family: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        .btn-primary,
        .nav-cta {
            background: var(--gradient-primary);
        }
        
        .btn-secondary {
            border-color: var(--secondary-blue);
            color: var(--secondary-blue);
        }
        
        .btn-secondary:hover {
            background: var(--secondary-blue);
            color: white;
        }
        
        .logo-icon {
            background: var(--gradient-primary);
        }
        
        .social-link:hover {
            background: var(--secondary-blue);
            border-color: var(--secondary-blue);
        }
        
        .feature-icon {
            background: var(--gradient-primary);
        }
        
        .hero-title {
            background: var(--gradient-primary);
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
            color: var(--secondary-blue);
        }
        
        .badge-primary {
            background: #dbeafe;
            color: var(--primary-blue);
        }
        
        .badge-success {
            background: #d1fae5;
            color: var(--success-green);
        }
        
        .badge-warning {
            background: #fed7aa;
            color: var(--warning-amber);
        }
        
        .badge-error {
            background: #fee2e2;
            color: var(--error-red);
        }
    </style>
    <?php
}
add_action('wp_head', 'billiardtoday_corporate_customizer_css');

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
