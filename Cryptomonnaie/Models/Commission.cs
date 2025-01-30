namespace Cryptomonnaie.Models
{
    public class Commission
    {
        public int Id { get; set; }
        public string Type { get; set; }
        public decimal Pourcentage { get; set; }
        public DateTime DateModification { get; set; }
    }

    public class CommissionUpdateRequest
    {
        public string Type { get; set; }
        public decimal Pourcentage { get; set; }
    }
} 