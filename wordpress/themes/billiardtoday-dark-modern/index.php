<?php
/**
 * Main template file for BilliardToday Dark Modern Theme
 */

get_header(); ?>

<main>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">
                Billiard
                <br>
                <span style="background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Today</span>
            </h1>
            <p class="hero-subtitle">
                Experience the future of billiard tournament management with our cutting-edge dark theme. 
                Modern design meets powerful functionality in a sleek, contemporary interface.
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
                <h2 class="section-title">
                    Modern Features for
                    <span style="background: linear-gradient(135deg, #ffffff 0%, #00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"> Champions</span>
                </h2>
                <p class="section-subtitle">
                    Cutting-edge features designed for the modern billiard tournament experience
                </p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🌟</div>
                    <h3 class="feature-title">Dark Mode Design</h3>
                    <p class="feature-description">
                        Sleek dark interface with vibrant accent colors and modern visual effects for reduced eye strain.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3 class="feature-title">Lightning Fast</h3>
                    <p class="feature-description">
                        Optimized performance with instant updates and smooth animations powered by modern web technologies.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Precision Focus</h3>
                    <p class="feature-description">
                        Distraction-free environment that keeps your attention on what matters most - the game.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3 class="feature-title">Advanced Analytics</h3>
                    <p class="feature-description">
                        Comprehensive statistics and insights with beautiful data visualization in a modern dashboard.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🌍</div>
                    <h3 class="feature-title">Global Connectivity</h3>
                    <p class="feature-description">
                        Connect with players worldwide in a sophisticated, modern tournament environment.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🏆</div>
                    <h3 class="feature-title">Elite Experience</h3>
                    <p class="feature-description">
                        Professional-grade features presented with the sophistication and elegance of modern design.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Latest Posts/News -->
    <?php if (have_posts()) : ?>
    <section class="latest-news" style="padding: 80px 0; background: var(--bg-primary);">
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
            <h2 style="font-size: 3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; background: linear-gradient(135deg, #00d4ff 0%, #ff006e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; position: relative; z-index: 2;">
                Ready for the
                <br>
                <span style="color: #ffbe0b;">Future?</span>
            </h2>
            <p style="font-size: 1.25rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; position: relative; z-index: 2;">
                Join thousands of players who love the modern, sophisticated interface of BilliardToday Dark Modern. 
                Experience the perfect blend of style and functionality.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; position: relative; z-index: 2;">
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
