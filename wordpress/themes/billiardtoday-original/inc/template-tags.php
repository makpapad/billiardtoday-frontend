<?php
/**
 * Custom template tags for BilliardToday Original Theme
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Prints HTML with meta information for the current post-date/time.
 */
function billiardtoday_posted_on() {
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
function billiardtoday_posted_by() {
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
function billiardtoday_entry_footer() {
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
                    /* translators: %s: post title */
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
function billiardtoday_post_thumbnail() {
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
function billiardtoday_get_navigation() {
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
function billiardtoday_get_footer_menu() {
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
function billiardtoday_custom_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'billiardtoday_custom_excerpt_length');

/**
 * Custom excerpt more.
 */
function billiardtoday_custom_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'billiardtoday_custom_excerpt_more');

/**
 * Get custom logo with fallback.
 */
function billiardtoday_get_logo() {
    if (function_exists('the_custom_logo') && has_custom_logo()) {
        the_custom_logo();
    } else {
        ?>
        <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        </div>
        <?php
    }
}

/**
 * Get copyright text.
 */
function billiardtoday_get_copyright() {
    $copyright = get_theme_mod('copyright_text', __('© 2024 BilliardToday. All rights reserved.', 'billiardtoday'));
    echo wp_kses_post($copyright);
}

/**
 * Get social links.
 */
function billiardtoday_get_social_links() {
    $facebook = get_theme_mod('facebook_url', '');
    $twitter = get_theme_mod('twitter_url', '');
    $linkedin = get_theme_mod('linkedin_url', '');
    
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
?>
