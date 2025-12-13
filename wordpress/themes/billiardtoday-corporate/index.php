<?php
/**
 * Main template file for BilliardToday Corporate Theme
 */

get_header(); ?>

<main>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">
                Professional
                <br>
                <span style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Tournament Management</span>
            </h1>
            <p class="hero-subtitle">
                Enterprise-grade billiard tournament platform designed for professional organizations, 
                clubs, and corporate events. Streamline your tournaments with powerful business features.
            </p>
            <div class="hero-cta">
                <a href="#tournaments" class="btn-primary">
                    Start Free Trial
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </a>
                <a href="#demo" class="btn-secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Request Demo
                </a>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section" style="padding: 80px 0; background: var(--bg-primary);">
        <div class="container">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">500+</div>
                    <div class="stat-label">Corporate Clients</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">10K+</div>
                    <div class="stat-label">Tournaments</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">50K+</div>
                    <div class="stat-label">Active Players</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">99.9%</div>
                    <div class="stat-label">Uptime</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Enterprise Features for Professional Organizations</h2>
                <p class="section-subtitle">Powerful tools designed to meet the demands of corporate tournament management</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🏢</div>
                    <h3 class="feature-title">Corporate Integration</h3>
                    <p class="feature-description">
                        Seamless integration with enterprise systems, SSO authentication, and corporate branding options.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3 class="feature-title">Advanced Analytics</h3>
                    <p class="feature-description">
                        Comprehensive reporting dashboards, ROI tracking, and business intelligence for tournament insights.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🔒</div>
                    <h3 class="feature-title">Enterprise Security</h3>
                    <p class="feature-description">
                        Bank-level security, GDPR compliance, and advanced permission management for corporate environments.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🌐</div>
                    <h3 class="feature-title">Multi-Location Support</h3>
                    <p class="feature-description">
                        Manage tournaments across multiple venues, locations, and regions from a single centralized platform.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">💼</div>
                    <h3 class="feature-title">Business Tools</h3>
                    <p class="feature-description">
                        Invoice generation, payment processing, sponsor management, and financial reporting capabilities.
                    </p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Custom Workflows</h3>
                    <p class="feature-description">
                        Tailored tournament workflows, automated processes, and custom rule engines for unique requirements.
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
                <h2 class="section-title">Corporate News & Insights</h2>
                <p class="section-subtitle">Stay updated with the latest trends in professional tournament management</p>
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
            <h2 style="font-size: 3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; position: relative; z-index: 2;">
                Ready for
                <span style="color: #3b82f6;">Enterprise Solutions?</span>
            </h2>
            <p style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; position: relative; z-index: 2;">
                Join leading organizations that trust BilliardToday Corporate for their professional 
                tournament management needs. Experience enterprise-grade features and dedicated support.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; position: relative; z-index: 2;">
                <a href="#signup" class="btn-primary">
                    Start Free Trial
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </a>
                <a href="#demo" class="btn-secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Request Demo
                </a>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>
