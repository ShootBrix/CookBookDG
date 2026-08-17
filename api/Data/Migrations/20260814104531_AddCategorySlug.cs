using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CbdgApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategorySlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Categories",
                type: "character varying(220)",
                maxLength: 220,
                nullable: false,
                defaultValue: "");

            // Backfill existing categories before the unique index below can be
            // created - every row currently has Slug = '' from the default above,
            // which would collide instantly. Mirrors Slug.From()'s ASCII path
            // (lowercase, spaces -> hyphens, strip anything else); Postgres's
            // default (non-ICU) regex classes don't reliably match non-Latin
            // letters, so a category already named in Hebrew before this
            // migration runs would fall through to the id-based fallback below
            // rather than getting a Hebrew slug - acceptable for a one-time
            // backfill of pre-launch seed data (new categories always go through
            // the Unicode-aware C# Slug.From() instead).
            migrationBuilder.Sql(
                """
                UPDATE "Categories"
                SET "Slug" = trim(both '-' from regexp_replace(regexp_replace(lower(trim("Name")), '\s+', '-', 'g'), '[^a-z0-9\-]', '', 'g'))
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Categories" SET "Slug" = "Id"::text WHERE "Slug" = ''
                """);

            // Any backfilled duplicates (two categories that happened to share a
            // name) get -2, -3, ... appended, same suffixing rule the app uses
            // for new categories going forward.
            migrationBuilder.Sql(
                """
                WITH ranked AS (
                    SELECT "Id", "Slug", ROW_NUMBER() OVER (PARTITION BY "Slug" ORDER BY "Ordinal") AS rn
                    FROM "Categories"
                )
                UPDATE "Categories" c
                SET "Slug" = c."Slug" || '-' || ranked.rn
                FROM ranked
                WHERE c."Id" = ranked."Id" AND ranked.rn > 1
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Categories_Slug",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Categories");
        }
    }
}
