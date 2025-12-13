<?php
/**
 * Customizer functionality for BilliardToday Dark Modern Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for selective refresh
 */
function billiardtoday_dark_modern_customize_register($wp_customize) {
    
    // Theme Color Settings
    $wp_customize->add_section('billiardtoday_dark_modern_colors', array(
        'title'    => __('Theme Colors', 'billiardtoday'),
        'priority' => 30,
    ));
    
    // Primary Accent Color
    $wp_customize->add_setting('primary_accent', array(
        'default'           => '#00d4ff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_accent', array(
        'label'    => __('Primary Accent', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'primary_accent',
    )));
    
    // Secondary Accent Color
    $wp_customize->add_setting('secondary_accent', array(
        'default'           => '#ff006e',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_accent', array(
        'label'    => __('Secondary Accent', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'secondary_accent',
    )));
    
    // Tertiary Accent Color
    $wp_customize->add_setting('tertiary_accent', array(
        'default'           => '#ffbe0b',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'tertiary_accent', array(
        'label'    => __('Tertiary Accent', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'tertiary_accent',
    )));
    
    // Background Colors
    $wp_customize->add_setting('bg_primary_dark', array(
        'default'           => '#0a0a0a',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_primary_dark', array(
        'label'    => __('Primary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'bg_primary_dark',
    )));
    
    $wp_customize->add_setting('bg_secondary_dark', array(
        'default'           => '#1a1a1a',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_secondary_dark', array(
        'label'    => __('Secondary Background', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'bg_secondary_dark',
    )));
    
    $wp_customize->add_setting('bg_card_dark', array(
        'default'           => '#1e1e1e',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_card_dark', array(
        'label'    => __('Card Background', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'bg_card_dark',
    )));
    
    // Text Colors
    $wp_customize->add_setting('text_primary_dark', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_primary_dark', array(
        'label'    => __('Primary Text', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'text_primary_dark',
    )));
    
    $wp_customize->add_setting('text_muted_dark', array(
        'default'           => '#a0a0a0',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'text_muted_dark', array(
        'label'    => __('Muted Text', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_colors',
        'settings' => 'text_muted_dark',
    )));
    
    // Typography Settings
    $wp_customize->add_section('billiardtoday_dark_modern_typography', array(
        'title'    => __('Typography', 'billiardtoday'),
        'priority' => 35,
    ));
    
    // Font Family
    $wp_customize->add_setting('font_family_modern', array(
        'default'           => 'Inter',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_family_modern', array(
        'label'    => __('Font Family', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_typography',
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
    $wp_customize->add_setting('font_weight_modern', array(
        'default'           => '600',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('font_weight_modern', array(
        'label'    => __('Base Font Weight', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_typography',
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
    $wp_customize->add_section('billiardtoday_dark_modern_header', array(
        'title'    => __('Header Settings', 'billiardtoday'),
        'priority' => 40,
    ));
    
    // Logo Upload
    $wp_customize->add_setting('custom_logo_modern', array(
        'default'           => '',
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control(new WP_Customize_Cropped_Image_Control($wp_customize, 'custom_logo_modern', array(
        'label'    => __('Logo', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_header',
        'settings' => 'custom_logo_modern',
        'height'   => 100,
        'width'    => 100,
        'flex_height' => true,
        'flex_width'  => true,
    )));
    
    // Site Title Display
    $wp_customize->add_setting('display_site_title_modern', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('display_site_title_modern', array(
        'label'    => __('Display Site Title', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_header',
        'type'     => 'checkbox',
    ));
    
    // Footer Settings
    $wp_customize->add_section('billiardtoday_dark_modern_footer', array(
        'title'    => __('Footer Settings', 'billiardtoday'),
        'priority' => 45,
    ));
    
    // Copyright Text
    $wp_customize->add_setting('copyright_text_modern', array(
        'default'           => __('© 2024 BilliardToday. All rights reserved. Modern dark theme for champions.', 'billiardtoday'),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('copyright_text_modern', array(
        'label'    => __('Copyright Text', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_footer',
        'type'     => 'textarea',
    ));
    
    // Social Links
    $wp_customize->add_setting('facebook_url_modern', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('facebook_url_modern', array(
        'label'    => __('Facebook URL', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('twitter_url_modern', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('twitter_url_modern', array(
        'label'    => __('Twitter URL', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_footer',
        'type'     => 'url',
    ));
    
    $wp_customize->add_setting('linkedin_url_modern', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('linkedin_url_modern', array(
        'label'    => __('LinkedIn URL', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_footer',
        'type'     => 'url',
    ));
    
    // Effects Settings
    $wp_customize->add_section('billiardtoday_dark_modern_effects', array(
        'title'    => __('Visual Effects', 'billiardtoday'),
        'priority' => 50,
    ));
    
    // Enable Particles
    $wp_customize->add_setting('enable_particles', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('enable_particles', array(
        'label'    => __('Enable Particle Effects', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_effects',
        'type'     => 'checkbox',
    ));
    
    // Enable Glow Effects
    $wp_customize->add_setting('enable_glow', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('enable_glow', array(
        'label'    => __('Enable Glow Effects', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_effects',
        'type'     => 'checkbox',
    ));
    
    // Animation Speed
    $wp_customize->add_setting('animation_speed', array(
        'default'           => 'normal',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));
    
    $wp_customize->add_control('animation_speed', array(
        'label'    => __('Animation Speed', 'billiardtoday'),
        'section'  => 'billiardtoday_dark_modern_effects',
        'type'     => 'select',
        'choices'  => array(
            'slow'    => 'Slow',
            'normal'  => 'Normal',
            'fast'    => 'Fast',
        ),
    ));
}
add_action('customize_register', 'billiardtoday_dark_modern_customize_register');

/**
 * Customizer JS for live preview
 */
function billiardtoday_dark_modern_customize_preview_js() {
    wp_enqueue_script('billiardtoday-dark-modern-customizer', get_template_directory_uri() . '/js/customizer.js', array('customize-preview'), '1.0.0', true);
}
add_action('customize_preview_init', 'billiardtoday_dark_modern_customize_preview_js');

/**
 * Generate custom CSS from customizer settings
 */
function billiardtoday_dark_modern_customizer_css() {
    $primary_accent = get_theme_mod('primary_accent', '#00d4ff');
    $secondary_accent = get_theme_mod('secondary_accent', '#ff006e');
    $tertiary_accent = get_theme_mod('tertiary_accent', '#ffbe0b');
    $bg_primary = get_theme_mod('bg_primary_dark', '#0a0a0a');
    $bg_secondary = get_theme_mod('bg_secondary_dark', '#1a1a1a');
    $bg_card = get_theme_mod('bg_card_dark', '#1e1e1e');
    $text_primary = get_theme_mod('text_primary_dark', '#ffffff');
    $text_muted = get_theme_mod('text_muted_dark', '#a0a0a0');
    $font_family = get_theme_mod('font_family_modern', 'Inter');
    $font_weight = get_theme_mod('font_weight_modern', '600');
    $enable_particles = get_theme_mod('enable_particles', true);
    $enable_glow = get_theme_mod('enable_glow', true);
    $animation_speed = get_theme_mod('animation_speed', 'normal');
    
    // Animation speed multiplier
    $speed_multiplier = array('slow' => '2', 'normal' => '1', 'fast' => '0.5');
    $speed = $speed_multiplier[$animation_speed] ?? '1';
    
    ?>
    <style type="text/css">
        :root {
            --accent-primary: <?php echo esc_attr($primary_accent); ?>;
            --accent-secondary: <?php echo esc_attr($secondary_accent); ?>;
            --accent-tertiary: <?php echo esc_attr($tertiary_accent); ?>;
            --accent-gradient: linear-gradient(135deg, <?php echo esc_attr($primary_accent); ?> 0%, <?php echo esc_attr($secondary_accent); ?> 100%);
            --bg-primary: <?php echo esc_attr($bg_primary); ?>;
            --bg-secondary: <?php echo esc_attr($bg_secondary); ?>;
            --bg-card: <?php echo esc_attr($bg_card); ?>;
            --text-primary: <?php echo esc_attr($text_primary); ?>;
            --text-muted: <?php echo esc_attr($text_muted); ?>;
            --font-primary: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --animation-speed: <?php echo esc_attr($speed); ?>;
        }
        
        body {
            font-family: '<?php echo esc_attr($font_family); ?>', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        .btn-primary,
        .nav-cta {
            background: var(--accent-gradient);
        }
        
        .btn-secondary {
            border-color: var(--accent-primary);
            color: var(--accent-primary);
        }
        
        .btn-secondary:hover {
            background: var(--accent-primary);
            color: var(--bg-primary);
        }
        
        .logo-icon {
            background: var(--accent-gradient);
        }
        
        .social-link:hover {
            background: var(--accent-gradient);
            border-color: var(--accent-primary);
        }
        
        .feature-icon {
            background: var(--accent-gradient);
        }
        
        .hero-title {
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .section-title {
            background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-weight: <?php echo esc_attr($font_weight); ?>;
        }
        
        <?php if ($enable_glow): ?>
        .btn-primary,
        .nav-cta,
        .feature-icon,
        .logo-icon {
            box-shadow: 0 0 20px rgba(<?php echo hex2rgb($primary_accent); ?>, 0.5);
        }
        
        .btn-primary:hover,
        .nav-cta:hover,
        .feature-icon:hover,
        .logo-icon:hover {
            box-shadow: 0 0 30px rgba(<?php echo hex2rgb($secondary_accent); ?>, 0.7);
        }
        <?php endif; ?>
        
        <?php if (!$enable_particles): ?>
        .particle {
            display: none !important;
        }
        <?php endif; ?>
        
        /* Animation speed adjustments */
        * {
            animation-duration: calc(var(--animation-duration, 1s) * var(--animation-speed)) !important;
            transition-duration: calc(var(--transition-duration, 0.3s) * var(--animation-speed)) !important;
        }
    </style>
    <?php
}
add_action('wp_head', 'billiardtoday_dark_modern_customizer_css');

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
