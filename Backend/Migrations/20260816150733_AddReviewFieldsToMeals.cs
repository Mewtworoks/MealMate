using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MealMate.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewFieldsToMeals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Rating",
                table: "Meals",
                type: "double",
                nullable: false,
                defaultValue: 4.8);

            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                table: "Meals",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReviewsJson",
                table: "Meals",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "KitchenName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ServiceRadiusKm",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OrderNumber",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Meals");

            migrationBuilder.DropColumn(
                name: "ReviewCount",
                table: "Meals");

            migrationBuilder.DropColumn(
                name: "ReviewsJson",
                table: "Meals");

            migrationBuilder.AlterColumn<decimal>(
                name: "WalletBalance",
                table: "Users",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "CreditUsed",
                table: "Users",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "CreditLimit",
                table: "Users",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "Users",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubscriptionId",
                table: "SubscriptionSkippedDays",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "SubscriptionSkippedDays",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "Subscriptions",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "Subscriptions",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubscriptionId",
                table: "SubscriptionRotationMeals",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "MealId",
                table: "SubscriptionRotationMeals",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "SubscriptionRotationMeals",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubscriptionId",
                table: "SubscriptionPausedDays",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "SubscriptionPausedDays",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "Orders",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "AgentId",
                table: "Orders",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "Orders",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "OrderId",
                table: "OrderItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "MealId",
                table: "OrderItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "OrderItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "AgentId",
                table: "Meals",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "Meals",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "MealId",
                table: "CartItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "CartItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "CartItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "AgentId",
                table: "AgentPayouts",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "AgentPayouts",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "AgentId",
                table: "AgentAdvances",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "AgentAdvances",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldCollation: "utf8mb4_bin");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "FullName" },
                values: new object[] { new DateTime(2026, 6, 6, 6, 9, 30, 653, DateTimeKind.Utc).AddTicks(2707), "Default Agent" });
        }
    }
}
