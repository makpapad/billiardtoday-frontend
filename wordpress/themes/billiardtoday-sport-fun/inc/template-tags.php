<?php
/**
 * Custom template tags for BilliardToday Sport Fun Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Prints HTML with meta information for the current post-date/time.
 */
function billiardtoday_sport_fun_posted_on() {
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
function billiardtoday_sport_fun_posted_by() {
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
function billiardtoday_sport_fun_entry_footer() {
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
function billiardtoday_sport_fun_post_thumbnail() {
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
function billiardtoday_sport_fun_get_navigation() {
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
        echo '<li><a href="#gaming">' . esc_html__('Gaming', 'billiardtoday') . '</a></li>';
        echo '<li><a href="#about">' . esc_html__('About', 'billiardtoday') . '</a></li>';
        echo '</ul>';
    }
}

/**
 * Gets the footer navigation menu.
 */
function billiardtoday_sport_fun_get_footer_menu() {
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
function billiardtoday_sport_fun_custom_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'billiardtoday_sport_fun_custom_excerpt_length');

/**
 * Custom excerpt more.
 */
function billiardtoday_sport_fun_custom_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'billiardtoday_sport_fun_custom_excerpt_more');

/**
 * Get custom logo with fallback.
 */
function billiardtoday_sport_fun_get_logo() {
    if (function_exists('the_custom_logo') && has_custom_logo()) {
        the_custom_logo();
    } else {
        ?>
        <div class="logo-icon">
            🎮
        </div>
        <?php
    }
}

/**
 * Get copyright text.
 */
function billiardtoday_sport_fun_get_copyright() {
    $copyright = get_theme_mod('copyright_text_fun', __('© 2024 BilliardToday. All rights reserved. Fun gaming tournament platform! 🎮', 'billiardtoday'));
    echo wp_kses_post($copyright);
}

/**
 * Get social links.
 */
function billiardtoday_sport_fun_get_social_links() {
    $facebook = get_theme_mod('facebook_url_fun', '');
    $twitter = get_theme_mod('twitter_url_fun', '');
    $linkedin = get_theme_mod('linkedin_url_fun', '');
    
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
 * Get fun gradient text
 */
function billiardtoday_sport_fun_gradient_text($text, $gradient = null) {
    if (!$gradient) {
        $gradient = 'var(--gradient-primary)';
    }
    return '<span style="background: ' . esc_attr($gradient) . '; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">' . esc_html($text) . '</span>';
}

/**
 * Get fun card with hover effect
 */
function billiardtoday_sport_fun_card($content, $class = '') {
    return '<div class="fun-card ' . esc_attr($class) . '">' . $content . '</div>';
}

/**
 * Get fun button
 */
function billiardtoday_sport_fun_button($text, $url = '#', $type = 'primary', $icon = '') {
    $icon_html = $icon ? '<span class="button-icon">' . $icon . '</span>' : '';
    return '<a href="' . esc_url($url) . '" class="btn btn-' . esc_attr($type) . '">' . $icon_html . esc_html($text) . '</a>';
}

/**
 * Get fun badge
 */
function billiardtoday_sport_fun_badge($text, $type = 'primary') {
    return '<span class="badge badge-' . esc_attr($type) . '">' . esc_html($text) . '</span>';
}

/**
 * Get fun icon
 */
function billiardtoday_sport_fun_icon($name, $size = 20) {
    $icons = array(
        'play' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        'arrow' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>',
        'check' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        'star' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        'game' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"/><path d="M6 12h4m-2-2v4m10-4h4m-2-2v4"/></svg>',
        'trophy' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55.47.98.97 1.21C12.54 18.69 14 18.95 14 18.95s1.46-.26 3.03-.74c.5-.23.97-.66.97-1.21v-2.34"/><path d="M18 10a6 6 0 0 0-12 0"/></svg>',
        'medal' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/><path d="M12 2v15.77"/></svg>',
        'target' => '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    );
    
    return isset($icons[$name]) ? $icons[$name] : '';
}

/**
 * Add fun card styles
 */
function billiardtoday_sport_fun_add_card_styles() {
    ?>
    <style>
        .fun-card {
            background: var(--bg-card);
            border: 2px solid var(--bg-border);
            border-radius: 20px;
            padding: 2rem;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        
        .fun-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--gradient-secondary);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .fun-card:hover::before {
            opacity: 0.1;
        }
        
        .fun-card:hover {
            transform: translateY(-5px) scale(1.02);
            border-color: var(--accent-yellow);
            box-shadow: var(--shadow-xl);
        }
        
        .button-icon {
            margin-right: 0.5rem;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            border-radius: 50px;
            font-size: 0.875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            font-family: "Fredoka One", cursive;
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
add_action('wp_head', 'billiardtoday_sport_fun_add_card_styles');

/**
 * Get fun stats
 */
function billiardtoday_sport_fun_get_stats() {
    $stats = array(
        'players' => get_theme_mod('stats_players_fun', '1000+'),
        'events' => get_theme_mod('stats_events_fun', '500+'),
        'matches' => get_theme_mod('stats_matches_fun', '25K+'),
        'fun_factor' => get_theme_mod('stats_fun_factor', '99%'),
    );
    
    return $stats;
}

/**
 * Display fun stats grid
 */
function billiardtoday_sport_fun_display_stats() {
    $stats = billiardtoday_sport_fun_get_stats();
    
    echo '<div class="stats-grid">';
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['players']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Fun Players', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['events']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Gaming Events', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['matches']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Awesome Matches', 'billiardtoday') . '</div>';
    echo '</div>';
    
    echo '<div class="stat-item">';
    echo '<div class="stat-number">' . esc_html($stats['fun_factor']) . '</div>';
    echo '<div class="stat-label">' . esc_html__('Fun Factor', 'billiardtoday') . '</div>';
    echo '</div>';
    echo '</div>';
}

/**
 * Get fun tagline
 */
function billiardtoday_sport_fun_get_tagline() {
    return get_theme_mod('fun_tagline', __('Exciting and playful billiard tournament platform', 'billiardtoday'));
}

/**
 * Get CTA button text
 */
function billiardtoday_sport_fun_get_cta_text() {
    return get_theme_mod('cta_button_text_fun', __('Start Playing', 'billiardtoday'));
}

/**
 * Get demo button text
 */
function billiardtoday_sport_fun_get_demo_text() {
    return get_theme_mod('demo_button_text_fun', __('Watch Demo', 'billiardtoday'));
}
?>
