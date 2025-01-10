using System;
using System.ComponentModel.DataAnnotations;

public class Utilisateur
{
    public int Id_Utilisateur { get; set; }
    [Required]
    public string Username { get; set; }
    [Required, EmailAddress]
    public string Email { get; set; }
    [Required]
    public string Mdp { get; set; }
    public bool Is_Valid { get; set; }
}