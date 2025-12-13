<?php
/**
 * Main template file for BilliardToday Sport Fun Theme
 */

get_header(); ?>

<main>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">
                Fun
                <br>
                <span style="background: linear-gradient(135deg, #ff006e 0%, #ff6b35 25%, #ffd166 50%, #06ffa5 75%, #00d9ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Tournament Gaming</span>
            </h1>
            <p class="hero-subtitle">
                Exciting and playful billiard tournament platform designed for gaming enthusiasts, 
                clubs, and fun events. Level up your tournaments with colorful features and awesome animations!
            </p>
            <div class="hero-cta">
                <a href="#tournaments" class="btn-primary">
                    Start Playing
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
    <section class="stats-section" style="padding: 80px 0; background: var(--bg-primary);">
        <div class="container">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">1000+</div>
                    <div class="stat-label">Fun Players</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">500+</div>
                    <div class="stat-label">Gaming Events</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">25K+</div>
                    <div class="stat-label">Awesome Matches</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">99%</div>
                    <div class="stat-label">Fun Factor</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">🎮 Fun Features for Gaming Champions</h2>
                <p class="section-subtitle">Awesome tools designed to make your tournaments exciting and memorable</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Gaming Mode</h3>
                    <p class="feature-description">
                        Playful scoring system with achievements, badges, and leaderboards for competitive fun.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🏆</div>
                    <h3 class="feature-title">Tournament Fun</h3>
                    <p class="feature-description">
                        Colorful tournament brackets with animations, celebrations, and victory effects.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎨</div>
                    <h3 class="feature-title">Custom Themes</h3>
                    <p class="feature-description">
                        Personalize your tournaments with fun colors, themes, and playful designs.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎮</div>
                    <h3 class="feature-title">Game Integration</h3>
                    <p class="feature-description">
                        Connect with gaming platforms, share scores, and challenge friends online.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎉</div>
                    <h3 class="feature-title">Celebrations</h3>
                    <p class="feature-description">
                        Animated celebrations, confetti effects, and fun victory moments.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🏅</div>
                    <h3 class="feature-title">Achievements</h3>
                    <p class="feature-description">
                        Unlock achievements, earn badges, and climb the fun leaderboard.
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
                <h2 class="section-title">🎯 Gaming News & Updates</h2>
                <p class="section-subtitle">Stay updated with the latest fun trends and gaming tournaments</p>
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
            <h2 style="font-size: 3rem; font-weight: 900; color: var(--text-primary); margin-bottom: 1.5rem; font-family: var(--font-fun); position: relative; z-index: 2;">
                Ready for
                <span style="background: linear-gradient(135deg, #ff6b35 0%, #ff006e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Gaming Fun?</span>
            </h2>
            <p style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; position: relative; z-index: 2;">
                Join thousands of gaming enthusiasts who trust BilliardToday Sport Fun for their exciting 
                tournament needs. Experience colorful features and awesome animations!
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; position: relative; z-index: 2;">
                <a href="#signup" class="btn-primary">
                    Start Playing
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
