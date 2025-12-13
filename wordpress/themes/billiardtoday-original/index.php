<?php
/**
 * Main template file for BilliardToday Original Theme
 */

get_header(); ?>

<main>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">
                Billiard<br>
                <span style="background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Today</span>
            </h1>
            <p class="hero-subtitle">
                The ultimate platform for organizing, managing, and following billiard tournaments. 
                Live scores, professional brackets, and comprehensive analytics.
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

    <!-- Stats Section -->
    <section class="stats">
        <div class="container">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-number">500+</div>
                    <div class="stat-label">Active Tournaments</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-number">10,000+</div>
                    <div class="stat-label">Registered Players</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-number">50,000+</div>
                    <div class="stat-label">Matches Played</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">
                    Everything You Need for
                    <span style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"> Professional Tournaments</span>
                </h2>
                <p class="section-subtitle">
                    Powerful features designed for tournament organizers, players, and billiard enthusiasts.
                </p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3 class="feature-title">Lightning Fast</h3>
                    <p class="feature-description">
                        Real-time score updates and instant bracket generation with zero lag.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <h3 class="feature-title">Secure & Reliable</h3>
                    <p class="feature-description">
                        Enterprise-grade security with 99.9% uptime guarantee.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3 class="feature-title">Advanced Analytics</h3>
                    <p class="feature-description">
                        Detailed statistics, player performance tracking, and tournament insights.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">👥</div>
                    <h3 class="feature-title">Player Management</h3>
                    <p class="feature-description">
                        Comprehensive player profiles, rankings, and history tracking.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🌍</div>
                    <h3 class="feature-title">Global Reach</h3>
                    <p class="feature-description">
                        Support for multiple languages and international tournament formats.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🕐</div>
                    <h3 class="feature-title">24/7 Availability</h3>
                    <p class="feature-description">
                        Round-the-clock access to tournaments and live scoring.
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
                <h2 class="section-title">Latest News & Updates</h2>
                <p class="section-subtitle">Stay updated with the latest tournament news and platform updates</p>
            </div>
            
            <div class="posts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
                <?php while (have_posts()) : the_post(); ?>
                <article class="post-card" style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--bg-border); transition: transform 0.3s ease;">
                    <?php if (has_post_thumbnail()) : ?>
                        <div class="post-thumbnail" style="margin-bottom: 1.5rem; border-radius: 0.5rem; overflow: hidden;">
                            <?php the_post_thumbnail('medium'); ?>
                        </div>
                    <?php endif; ?>
                    
                    <div class="post-content">
                        <div class="post-meta" style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                            <time datetime="<?php echo get_the_date('c'); ?>"><?php echo get_the_date(); ?></time>
                            <span style="margin: 0 0.5rem;">•</span>
                            <span><?php echo get_the_category_list(', '); ?></span>
                        </div>
                        
                        <h3 class="post-title" style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">
                            <a href="<?php the_permalink(); ?>" style="color: var(--text-primary); text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='var(--accent-purple)'" onmouseout="this.style.color='var(--text-primary)'">
                                <?php the_title(); ?>
                            </a>
                        </h3>
                        
                        <div class="post-excerpt" style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem;">
                            <?php the_excerpt(); ?>
                        </div>
                        
                        <a href="<?php the_permalink(); ?>" class="read-more" style="color: var(--accent-purple); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; transition: gap 0.3s ease;" onmouseover="this.style.gap='0.75rem'" onmouseout="this.style.gap='0.5rem'">
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
    <section class="cta-section" style="padding: 80px 0; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); text-align: center;">
        <div class="container">
            <h2 style="font-size: 3rem; font-weight: 800; color: white; margin-bottom: 1.5rem;">
                Ready to Transform Your
                <br>
                <span style="color: #ffd600;">Billiard Tournaments?</span>
            </h2>
            <p style="font-size: 1.25rem; color: rgba(255,255,255,0.9); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                Join the community of professional organizers and players who trust BilliardToday 
                for their tournament management needs.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="#signup" class="btn-primary" style="background: white; color: var(--accent-purple);">
                    Start Free Trial
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </a>
                <a href="#demo" class="btn-secondary" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">
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
