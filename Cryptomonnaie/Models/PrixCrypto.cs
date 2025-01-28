public class PrixCrypto
{
    public int Id_Prix { get; set; }
    public decimal Prix { get; set; }
    public DateTime Date_Prix { get; set; }
    public int Id_Crypto { get; set; }
    public Crypto Crypto { get; set; }
} 