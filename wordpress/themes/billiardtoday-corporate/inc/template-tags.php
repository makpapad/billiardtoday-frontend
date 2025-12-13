<?php
/**
 * Custom template tags for BilliardToday Corporate Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Prints HTML with meta information for the current post-date/time.
 */
function billiardtoday_corporate_posted_on() {
    $time_string = '<time class="entry-date published updated" datetime="%1$s">%2$s</time>';
    if (get_the_time('U') !== get_the_modified_time('U')) {
        $time_string = '<time class="entry-date published" datetime="%1$s">%2$s</time><time class="updated" datetime="%3$s">%4$s</time>';
    }

    $time_string = sprintf(
        $time_string,
        esc_attr(get_the_date(DATE_W3C)),
        esc_html(get_the_date()),
        esc_attr(get_the_modified_date(DATE_W3C)),
        esc_html(get_the_modified_date())
    );

    $posted_on = sprintf(
        /* translators: %s: post date. */
        esc_html_x('Posted on %s', 'post date', 'billiardtoday'),
        '<a href="' . esc_url(get_permalink()) . '" rel="bookmark">' . $time_string . '</a>'
    );

    echo '<span class="posted-on">' . $posted_on . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Prints HTML with meta information for the current author.
 */
function billiardtoday_corporate_posted_by() {
    $byline = sprintf(
        /* translators: %s: post author. */
        esc_html_x('by %s', 'post author', 'billiardtoday'),
        '<span class="author vcard"><a class="url fn n" href="' . esc_url(get_author_posts_url(get_the_author_meta('ID'))) . '">' . esc_html(get_the_author()) . '</a></span>'
    );

    echo '<span class="byline"> ' . $byline . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Prints HTML with meta information for the categories, tags and comments.
 */
function billiardtoday_corporate_entry_footer() {
    // Hide category and tag text for pages.
    if ('post' === get_post_type()) {
        /* translators: used between list items, there is a space after the comma */
        $categories_list = get_the_category_list(esc_html__(', ', 'billiardtoday'));
        if ($categories_list) {
            /* translators: 1: list of categories. */
            printf('<span class="cat-links">' . esc_html__('Posted in %1$s', 'billiardtoday') . '</span>', $categories_list); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        }

        /* translators: used between list items, there is a space after the comma */
        $tags_list = get_the_tag_list('', esc_html_x(', ', 'list item separator', 'billiardtoday'));
        if ($tags_list) {
            /* translators: 1: list of tags. */
            printf('<span class="tags-links">' . esc_html__('Tagged %1$s', 'billiardtoday') . '</span>', $tags_list); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        }
    }

    if (!is_single() && !post_password_required() && (comments_open() || get_comments_number())) {
        echo '<span class="comments-link">';
        comments_popup_link(
            sprintf(
                wp_kses(
                    /* translators: %s: Name of current post. Only visible to screen readers */
                    __('Leave a Comment<span class="screen-reader-text"> on %s</span>', 'billiardtoday'),
                    array(
                        'span' => array(
                            'class' => array(),
                        ),
                    )
                ),
                get_the_title()
            )
        );
        echo '</span>';
    }

    edit_post_link(
        sprintf(
            wp_kses(
                /* translators: %s: Name of current post. Only visible to screen readers */
                __('Edit <span class="screen-reader-text">%s</span>', 'billiardtoday'),
                array(
                    'span' => array(
                        'class' => array(),
                    ),
                )
            ),
            get_the_title()
        ),
        '<span class="edit-link">',
        '</span>'
    );
}

/**
 * Displays an optional post thumbnail.
 *
 * Wraps the post thumbnail in an anchor element on index views, or a div
 * element when on single views.
 */
function billiardtoday_corporate_post_thumbnail() {
    if (post_password_required() || is_attachment() || !has_post_thumbnail()) {
        return;
    }

    if (is_singular()) :
        ?>

        <div class="post-thumbnail">
            <?php the_post_thumbnail('large'); ?>
        </div><!-- .post-thumbnail -->

        <?php
    else :
        ?>

        <a class="post-thumbnail" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
            <?php
            the_post_thumbnail(
                'post-thumbnail',
                array(
                    'alt' => the_title_attribute(
                        array(
                            'echo' => false,
                        )
                    ),
                )
            );
            ?>
        </a>

        <?php
    endif; // End is_singular().
}

/**
 * Gets the navigation menu for the theme.
 */
function billiardtoday_corporate_get_navigation() {
    if (has_nav_menu('primary')) {
        wp_nav_menu(
            array(
                'theme_location' => 'primary',
                'menu_class'     => 'nav-menu',
                'container'      => false,
                'fallback_cb'    => false,
                'depth'          => 2,
            )
        );
    } else {
        // Fallback menu
        echo '<ul class="nav-menu">';
        echo '<li><a href="#features">' . esc_html__('Features', 'billiardtoday') . '</a></li>';
        echo '<li><a href="#tournaments">' . esc_html__('Tournaments', 'billiardtoday') . '</a></li>';
        echo '<li><a href="#pricing">' . esc_html__('Pricing', 'billiardtoday') . '</a></li>';
        echo '<li><a href="#about">' . esc_html__('About', 'billiardtoday') . '</a></li>';
        echo '</ul>';
    }
}

/**
 * Gets the footer navigation menu.
 */
function billiardtoday_corporate_get_footer_menu() {
    if (has_nav_menu('footer')) {
        wp_nav_menu(
            array(
                'theme_location' => 'footer',
                'menu_class'     => 'footer-links',
                'container'      => false,
                'fallback_cb'    => false,
            )
        );
    }
}

/**
 * Custom excerpt length.
 */
function billiardtoday_corporate_custom_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'billiardtoday_corporate_custom_excerpt_length');

/**
 * Custom excerpt more.
 */
function billiardtoday_corporate_custom_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'billiardtoday_corporate_custom_excerpt_more');

/**
 * Get custom logo with fallback.
 */
function billiardtoday_corporate_get_logo() {
    if (function_exists('the_custom_logo') && has_custom_logo()) {
        the_custom_logo();
    } else {
        ?>
        <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v20M2 12h20"/>
            </svg>
        </div>
        <?php
    }
}

/**
 * Get copyright text.
 */
function billiardtoday_corporate_get_copyright() {
    $copyright = get_theme_mod('copyright_text_corporate', __('© 2024 BilliardToday. All rights reserved. Professional corporate tournament management.', 'billiardtoday'));
    echo wp_kses_post($copyright);
}

/**
 * Get social links.
 */
function billiardtoday_corporate_get_social_links() {
    $facebook = get_theme_mod('facebook_url_corporate', '');
    $twitter = get_theme_mod('twitter_url_corporate', '');
    $linkedin = get_theme_mod('linkedin_url_corporate', '');
    
    if ($facebook || $twitter || $linkedin) {
        echo '<div class="footer-social">';
        
        if ($facebook) {
            echo '<a href="' . esc_url($facebook) . '" class="social-link" aria-label="Facebook" target="_blank">';
            echo '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">';
            echo '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>';
            echo '</svg>';
            echo '</a>';
        }
        
        if ($twitter) {
            echo '<a href="' . esc_url($twitter) . '" class="social-link" aria-label="Twitter" target="_blank">';
            echo '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">';
            echo '<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>';
            echo '</svg>';
            echo '</a>';
        }
        
        if ($linkedin) {
            echo '<a href="' . esc_url($linkedin) . '" class="social-link" aria-label="LinkedIn" target="_blank">';
            echo '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">';
            echo '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>';
            echo '</svg>';
            echo '</a>';
        }
        
        echo '</div>';
    }
}

/**
 * Get corporate gradient text
 */
function billiardtoday_corporate_gradient_text($text, $gradient = null) {
    if (!$gradient) {
        $gradient = 'var(--gradient-primary)';
    }
    return '<span style="background: ' . esc_attr($gradient) . '; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">' . esc_html($text) . '</span>';
}

/**
 * Get corporate card with hover effect
 */
function billiardtoday_corporate_card($content, $class = '') {
    return '<div class="corporate-card ' . esc_attr($class) . '">' . $content . '</div>';
}

/**
 * Get corporate button
 */
function billiardtoday_corporate_button($text, $url = '#', $type = 'primary', $icon = '') {
    $icon_html = $icon ? '<span class="button-icon">' . $icon . '</span>' : '';
    return '<a href="' . esc_url($url) . '" class="btn btn-' . esc_attr($type) . '">' . $icon_html . esc_html($text) . '</a>';
}

/**
 * Get corporate badge
 */
function billiardtoday_corporate_badge($text, $type = 'primary') {
    return '<span class="badge badge-' . esc_attr($type) . '">' . esc_html($text) . '</span>';
}

/**
 * Get corporate icon
 */
function billiardtoday_corporate_icon($name, $size = 20) {
    $icons = array(
        'play' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        'arrow' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>',
        'check' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        'star' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        'building' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 21V7h16v14M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>',
        'chart' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
        'lock' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
        'globe' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
        'briefcase' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
        'target' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    );
    
    return isset($icons[$name]) ? $icons[$name] : '';
}

/**
 * Add corporate card styles
 */
function billiardtoday_corporate_add_card_styles() {
    ?>
    <style>
        .corporate-card {
            background: var(--bg-card);
            border: 1px solid var(--bg-border);
            border-radius: 12px;
            padding: 2rem;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        
        .corporate-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--gradient-subtle);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .corporate-card:hover::before {
            opacity: 1;
        }
        
        .corporate-card:hover {
            transform: translateY(-2px);
            border-color: var(--accent-blue);
            box-shadow: var(--shadow-lg);
        }
        
        .button-icon {
            margin-right: 0.5rem;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }
        
        .badge-primary {
            background: var(--light-blue);
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
add_action('wp_head', 'billiardtoday_corporate_add_card_styles');

/**
 * Get corporate stats
 */
function billiardtoday_corporate_get_stats() {
    $stats = array(
        'clients' => get_theme_mod('stats_clients', '500+'),
        'tournaments' => get_theme_mod('stats_tournaments', '10K+'),
        'players' => get_theme_mod('stats_players', '50K+'),
        'uptime' => get_theme_mod('stats_uptime', '99.9%'),
    );
    
    return $stats;
}

/**
 * Display corporate stats grid
 */
function billiardtoday_corporate_display_stats() {
    $stats = billiardtoday_corporate_get_stats();
    
    echo '<div class="stats-grid">';
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['clients']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Corporate Clients', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['tournaments']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Tournaments', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['players']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Active Players', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['uptime']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Uptime', 'billiardtoday') . '</div>';
    echo '</div>';
    echo '</div>';
}

/**
 * Get company tagline
 */
function billiardtoday_corporate_get_tagline() {
    return get_theme_mod('company_tagline', __('Enterprise Tournament Management Platform', 'billiardtoday'));
}

/**
 * Get CTA button text
 */
function billiardtoday_corporate_get_cta_text() {
    return get_theme_mod('cta_button_text', __('Start Free Trial', 'billiardtoday'));
}

/**
 * Get demo button text
 */
function billiardtoday_corporate_get_demo_text() {
    return get_theme_mod('demo_button_text', __('Request Demo', 'billiardtoday'));
}
?>
