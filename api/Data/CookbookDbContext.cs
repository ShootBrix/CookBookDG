using CbdgApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace CbdgApi.Data;

public class CookbookDbContext(DbContextOptions<CookbookDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<RecipePage> Pages => Set<RecipePage>();
    public DbSet<SetupStep> SetupSteps => Set<SetupStep>();
    public DbSet<RecipeNode> Nodes => Set<RecipeNode>();
    public DbSet<RecipeImage> Images => Set<RecipeImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
            entity.Property(c => c.Slug).IsRequired().HasMaxLength(220);
            entity.HasIndex(c => c.Slug).IsUnique();
            entity.OwnsOne(c => c.Layout, layout =>
            {
                layout.Property(l => l.SpreadWidth).HasColumnName("SpreadWidth");
                layout.Property(l => l.SpreadHeight).HasColumnName("SpreadHeight");
                layout.Property(l => l.PageRatio).HasColumnName("PageRatio");
            });
            entity.HasMany(c => c.Pages)
                .WithOne(p => p.Category)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecipePage>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.CategoryId, p.Ordinal });

            entity.HasMany(p => p.SetupSteps)
                .WithOne()
                .HasForeignKey(s => s.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(p => p.Nodes)
                .WithOne()
                .HasForeignKey(n => n.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(p => p.Images)
                .WithOne()
                .HasForeignKey(i => i.PageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SetupStep>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => new { s.PageId, s.Ordinal });
        });

        modelBuilder.Entity<RecipeNode>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.HasIndex(n => new { n.PageId, n.ParentId, n.Ordinal });
            entity.HasOne<RecipeNode>()
                .WithMany()
                .HasForeignKey(n => n.ParentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecipeImage>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.HasIndex(i => new { i.PageId, i.Ordinal });
            entity.Property(i => i.Bytes).HasColumnType("bytea");
        });
    }
}
