using System;
using System.ComponentModel.DataAnnotations;
public class LimiteConnexion
{
    public int Id_Limite { get; set; }
    public int Limite { get; set; } = 3;
}