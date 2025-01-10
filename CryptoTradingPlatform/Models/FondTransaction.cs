using System;
using System.ComponentModel.DataAnnotations;
public class FondTransaction
{
    public int Id_Fond { get; set; }
    public string Type { get; set; }
    public decimal Montant { get; set; }
    public DateTime DateTransaction { get; set; }
    public bool Is_Validate { get; set; }
    public int Id_Portefeuille { get; set; }
}
