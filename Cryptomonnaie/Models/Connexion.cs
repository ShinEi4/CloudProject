using System;
using System.ComponentModel.DataAnnotations;
public class Connexion
{
    public int Id_Connexion { get; set; }
    public DateTime DateConnexion { get; set; }
    public bool Is_Valid { get; set; } = false;
    public int Id_Utilisateur { get; set; }
}
