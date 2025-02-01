namespace Cryptomonnaie.Models
{
    public class TransactionFilter
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Type { get; set; }
        public int? UserId { get; set; }
        public string? SortBy { get; set; }
        public string? SortOrder { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? CryptoId { get; set; }
    }
} 