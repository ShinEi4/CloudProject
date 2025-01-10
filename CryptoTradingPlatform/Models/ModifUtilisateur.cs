
using System;
using System.ComponentModel.DataAnnotations;

public class ModifUtilisateur
{
    public int Id_Modif { get; set; }
    public string Username { get; set; }
    public DateTime DateModif { get; set; }
    public int Id_Utilisateur { get; set; }
}
