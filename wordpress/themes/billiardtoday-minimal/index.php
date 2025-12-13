<?php
/**
 * Main template file for BilliardToday Minimal Theme
 */

get_header(); ?>

<main>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">
                Billiard
                <br>
                Today
            </h1>
            <p class="hero-subtitle">
                Minimal design for maximum focus. Clean, simple, and efficient tournament management 
                without distractions. Pure functionality meets elegant simplicity.
            </p>
            <div class="hero-cta">
                <a href="#tournaments" class="btn-primary">
                    Start Tournament
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </a>
                <a href="#demo" class="btn-secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Watch Demo
                </a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Simple Features for Complex Games</h2>
                <p class="section-subtitle">
                    Everything you need, nothing you don't. Streamlined tournament management
                </p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">○</div>
                    <h3 class="feature-title">Clean Interface</h3>
                    <p class="feature-description">
                        Minimal design that puts focus where it matters - on the game and players.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">□</div>
                    <h3 class="feature-title">Simple Scoring</h3>
                    <p class="feature-description">
                        Straightforward scoring system that's intuitive for players and organizers.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">△</div>
                    <h3 class="feature-title">Clear Analytics</h3>
                    <p class="feature-description">
                        Essential statistics presented without unnecessary complexity or visual noise.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">◇</div>
                    <h3 class="feature-title">Fast Performance</h3>
                    <p class="feature-description">
                        Lightweight design ensures instant updates and responsive interaction.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">◯</div>
                    <h3 class="feature-title">Universal Access</h3>
                    <p class="feature-description">
                        Works everywhere with a clean, consistent experience across all devices.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">◻</div>
                    <h3 class="feature-title">Essential Tools</h3>
                    <p class="feature-description">
                        Only the features you actually need for professional tournament management.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Latest Posts/News -->
    <?php if (have_posts()) : ?>
    <section class="latest-news" style="padding: 80px 0; background: var(--bg-secondary);">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Latest Updates</h2>
                <p class="section-subtitle">Stay informed with the latest tournament news and platform updates</p>
            </div>
            
            <div class="posts-grid">
                <?php while (have_posts()) : the_post(); ?>
                <article class="post-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <div class="post-thumbnail">
                            <?php the_post_thumbnail('medium'); ?>
                        </div>
                    <?php endif; ?>
                    
                    <div class="post-content">
                        <div class="post-meta">
                            <time datetime="<?php echo get_the_date('c'); ?>"><?php echo get_the_date(); ?></time>
                            <span style="margin: 0 0.5rem;">•</span>
                            <span><?php echo get_the_category_list(', '); ?></span>
                        </div>
                        
                        <h3 class="post-title">
                            <a href="<?php the_permalink(); ?>">
                                <?php the_title(); ?>
                            </a>
                        </h3>
                        
                        <div class="post-excerpt">
                            <?php the_excerpt(); ?>
                        </div>
                        
                        <a href="<?php the_permalink(); ?>" class="read-more">
                            Read More
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14m-7-7l7 7-7 7"/>
                            </svg>
                        </a>
                    </div>
                </article>
                <?php endwhile; ?>
            </div>
            
            <div class="posts-navigation" style="text-align: center; margin-top: 3rem;">
                <?php
                the_posts_pagination(array(
                    'mid_size'  => 2,
                    'prev_text' => __('← Previous', 'billiardtoday'),
                    'next_text' => __('Next →', 'billiardtoday'),
                ));
                ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <h2>Ready for Simplicity?</h2>
            <p>
                Experience tournament management stripped down to its essential elements. 
                Clean design, powerful features, maximum efficiency.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#signup" class="btn-primary">
                    Get Started
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </a>
                <a href="#demo" class="btn-secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Watch Demo
                </a>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>
