<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Navigation -->
<nav class="main-navigation">
    <div class="nav-container">
        <!-- Logo -->
        <a href="<?php echo esc_url(home_url('/')); ?>" class="logo">
            <div class="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </div>
            <span>BilliardToday</span>
        </a>

        <!-- Desktop Navigation -->
        <?php
        if (has_nav_menu('primary')) {
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'menu_class'     => 'nav-menu',
                'container'      => false,
                'fallback_cb'    => false,
            ));
        } else {
        ?>
        <ul class="nav-menu">
            <li><a href="#features">Features</a></li>
            <li><a href="#tournaments">Tournaments</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#about">About</a></li>
        </ul>
        <?php } ?>

        <!-- CTA Button -->
        <a href="#get-started" class="nav-cta">Get Started</a>
    </div>
</nav>
