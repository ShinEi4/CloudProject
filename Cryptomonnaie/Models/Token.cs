using System;
using System.ComponentModel.DataAnnotations;
public class Transaction
{
    public int Id_Transaction { get; set; }
    public string Type { get; set; }
    public decimal Quantite { get; set; }
    public decimal Prix_Unitaire { get; set; }
    public DateTime DateTransaction { get; set; }
    public bool Is_Validate { get; set; }
    public int Id_Portefeuille { get; set; }
    public int Id_Crypto { get; set; }
}
